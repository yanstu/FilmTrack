use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use anyhow::{Result, anyhow};
use crate::config::ConfigManager;
use regex;

// 豆瓣电影数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct DoubanMovie {
    pub title: String,
    pub original_title: String,
    pub douban_id: String,
    pub douban_url: String,
    pub cover_url: String,
    pub rating: f64,
    pub watched_date: String,
    pub type_: String, // movie 或 tv
    pub comment: Option<String>,
    pub tags: Vec<String>,
}

// 豆瓣爬虫
pub struct DoubanScraper {
    client: Client,
    request_interval: Duration,
}

impl DoubanScraper {
    // 创建新的爬虫实例
    pub fn new() -> Self {
        // 使用配置管理器获取请求间隔
        let request_interval_ms = ConfigManager::get_request_interval();
        let request_interval = Duration::from_millis(request_interval_ms);
        
        // 使用配置管理器获取用户代理
        let user_agent = ConfigManager::get().scraper.user_agent.clone();
        
        Self {
            client: reqwest::Client::builder()
                .user_agent(user_agent)
                .build()
                .unwrap_or_default(),
            request_interval,
        }
    }
    
    // 估算用户电影数量
    pub async fn estimate_movie_count(&self, user_id: &str) -> Result<u32> {
        let url = format!("https://movie.douban.com/people/{}/collect", user_id);
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow!("获取豆瓣页面失败: {}", response.status()));
        }
        
        let html = response.text().await?;
        let document = Html::parse_document(&html);
        
        // 尝试解析分页信息获取总数
        let selector = Selector::parse("div.paginator > a").unwrap();
        let mut max_page = 0;
        
        for element in document.select(&selector) {
            if let Some(page_text) = element.text().next() {
                if let Ok(page) = page_text.trim().parse::<u32>() {
                    if page > max_page {
                        max_page = page;
                    }
                }
            }
        }
        
        // 每页15条记录
        let estimated_count = if max_page > 0 {
            max_page * 15
        } else {
            // 如果没有分页，尝试直接获取条目数
            let count_selector = Selector::parse("span.subject-num").unwrap();
            if let Some(element) = document.select(&count_selector).next() {
                if let Some(count_text) = element.text().next() {
                    let parts: Vec<&str> = count_text.split('/').collect();
                    if parts.len() == 2 {
                        if let Ok(count) = parts[1].trim().parse::<u32>() {
                            count
                        } else {
                            15 // 默认值
                        }
                    } else {
                        15
                    }
                } else {
                    15
                }
            } else {
                15
            }
        };
        
        Ok(estimated_count)
    }
    
    // 获取用户电影列表
    pub async fn fetch_movies(&self, user_id: &str, start: u32) -> Result<Vec<DoubanMovie>> {
        let url = format!(
            "https://movie.douban.com/people/{}/collect?start={}&sort=time&rating=all&filter=all&mode=grid",
            user_id, start
        );
        
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow!("获取豆瓣页面失败: {}", response.status()));
        }
        
        let html = response.text().await?;
        
        // 使用请求间隔，避免请求过于频繁
        tokio::time::sleep(self.request_interval).await;
        
        self.parse_movie_list(&html)
    }
    
    // 解析电影列表页面
    fn parse_movie_list(&self, html: &str) -> Result<Vec<DoubanMovie>> {
        let document = Html::parse_document(html);
        let item_selector = Selector::parse("div.item").unwrap();
        let mut movies = Vec::new();
        
        for item in document.select(&item_selector) {
            if let Some(movie) = self.parse_movie_item(&item) {
                movies.push(movie);
            }
        }
        
        Ok(movies)
    }
    
    // 解析单个电影条目
    fn parse_movie_item(&self, item: &scraper::ElementRef) -> Option<DoubanMovie> {
        // 选择器
        let title_selector = Selector::parse("li.title > a").unwrap();
        let cover_selector = Selector::parse("div.pic > a > img").unwrap();
        let rating_selector = Selector::parse("span[class*='rating']").unwrap();
        let date_selector = Selector::parse("span.date").unwrap();
        let comment_selector = Selector::parse("span.comment").unwrap();
        let tags_selector = Selector::parse("span.tags").unwrap();
        
        // 获取标题和链接
        let title_element = item.select(&title_selector).next()?;
        let title = title_element.text().collect::<String>().trim().to_string();
        let douban_url = title_element.value().attr("href")?.to_string();
        
        // 从URL中提取ID
        let douban_id = douban_url
            .split('/')
            .filter(|s| !s.is_empty())
            .last()?
            .to_string();
        
        // 获取封面图片
        let cover_element = item.select(&cover_selector).next()?;
        let cover_url = cover_element.value().attr("src")?.to_string();
        
        // 获取评分（保持5分制）
        let rating = self.extract_rating(item, &rating_selector);
        
        // 获取观看日期
        let watched_date = if let Some(date_element) = item.select(&date_selector).next() {
            date_element.text().collect::<String>().trim().to_string()
        } else {
            String::new()
        };
        
        // 获取评论
        let comment = if let Some(comment_element) = item.select(&comment_selector).next() {
            let comment_text = comment_element.text().collect::<String>().trim().to_string();
            if comment_text.is_empty() {
                None
            } else {
                Some(comment_text)
            }
        } else {
            None
        };
        
        // 获取标签
        let tags = if let Some(tags_element) = item.select(&tags_selector).next() {
            let tags_text = tags_element.text().collect::<String>();
            tags_text
                .trim()
                .trim_start_matches("标签:")
                .split_whitespace()
                .map(|s| s.to_string())
                .collect()
        } else {
            Vec::new()
        };
        
        // 判断类型（电影或电视剧）
        // 这里使用更复杂的逻辑来判断是电影还是电视剧
        let type_ = self.determine_media_type(&title, &tags);
        
        // 提取原始标题
        let original_title = self.extract_original_title(&title);


        
        Some(DoubanMovie {
            title,
            original_title,
            douban_id,
            douban_url,
            cover_url,
            rating,
            watched_date,
            type_,
            comment,
            tags,
        })
    }
    
    // 提取评分（保持5分制）
    fn extract_rating(&self, item: &scraper::ElementRef, rating_selector: &Selector) -> f64 {
        // 尝试从星级图标获取评分
        if let Some(rating_element) = item.select(rating_selector).next() {
            let rating_class = match rating_element.value().attr("class") {
                Some(class) => class,
                None => return 0.0,
            };
            
            // 豆瓣使用5星制，我们也使用5分制
            if rating_class.contains("rating1-t") {
                1.0 // 1星 = 1分
            } else if rating_class.contains("rating2-t") {
                2.0 // 2星 = 2分
            } else if rating_class.contains("rating3-t") {
                3.0 // 3星 = 3分
            } else if rating_class.contains("rating4-t") {
                4.0 // 4星 = 4分
            } else if rating_class.contains("rating5-t") {
                5.0 // 5星 = 5分
            } else {
                0.0
            }
        } else {
            0.0
        }
    }
    
    // 判断媒体类型（电影或电视剧）
    fn determine_media_type(&self, title: &str, tags: &[String]) -> String {
        // 检查标题中的季数标识
        let has_season_in_title = title.contains("第") && (title.contains("季") || title.contains("部"));
        let has_english_season = title.to_lowercase().contains("season") || 
                               regex::Regex::new(r"s\d+").ok()
                                  .map_or(false, |re| re.is_match(title));
        
        // 检查标签
        let tv_related_tags = vec![
            String::from("剧集"), 
            String::from("电视剧"), 
            String::from("美剧"), 
            String::from("日剧"), 
            String::from("韩剧"), 
            String::from("英剧"), 
            String::from("动画"), 
            String::from("动漫"), 
            String::from("综艺")
        ];
        
        let has_tv_tags = tags.iter().any(|tag| tv_related_tags.contains(tag));
        
        // 检查其他电视剧特征
        let other_tv_indicators = vec![
            String::from("连续剧"), 
            String::from("剧场版"), 
            String::from("OVA"), 
            String::from("TV动画")
        ];
        
        let has_other_indicators = other_tv_indicators.iter().any(|indicator| title.contains(indicator));
        
        if has_season_in_title || has_english_season || has_tv_tags || has_other_indicators {
            String::from("tv")
        } else {
            String::from("movie")
        }
    }
    
    // 提取原始标题
    fn extract_original_title(&self, title: &str) -> String {
        // 处理形如"琅琊榜 / Nirvana in Fire / List of Langya"的情况
        // 只提取第一个"/"到第二个"/"之间的内容作为原始标题
        if let Some(first_pos) = title.find(" / ") {
            let after_first_slash = &title[first_pos + 3..];
            if let Some(second_pos) = after_first_slash.find(" / ") {
                // 有第二个"/"，提取第一个和第二个"/"之间的内容
                after_first_slash[..second_pos].to_string()
            } else {
                // 只有一个"/"，提取第一个"/"之后的所有内容
                after_first_slash.to_string()
            }
        } else if let Some(pos) = title.find("（") {
            // 处理形如"中文标题（原始标题）"的情况
            let end_pos = title[pos..].find("）").map(|p| p + pos).unwrap_or(title.len());
            if pos < end_pos {
                title[pos + 1..end_pos].to_string()
            } else {
                title.to_string()
            }
        } else {
            title.to_string()
        }
    }
} 