#!/usr/bin/env python3
"""
FilmTrack 数据库清理脚本
删除现有数据库文件，确保应用重新创建数据库结构
"""

import os
import sys
from pathlib import Path

def get_database_paths():
    """获取可能的数据库文件路径"""
    paths = []
    
    # 当前目录下的数据库文件
    current_dir = Path.cwd()
    paths.append(current_dir / "filmtrack.db")
    paths.append(current_dir / "data" / "filmtrack.db")
    
    # Windows用户数据目录
    if sys.platform == "win32":
        appdata = os.environ.get('APPDATA')
        if appdata:
            tauri_dir = Path(appdata) / "com.yanstu.filmtrack"
            paths.append(tauri_dir / "filmtrack.db")
    
    # macOS用户数据目录
    elif sys.platform == "darwin":
        home = Path.home()
        app_support = home / "Library" / "Application Support" / "com.yanstu.filmtrack"
        paths.append(app_support / "filmtrack.db")
    
    # Linux用户数据目录
    elif sys.platform == "linux":
        home = Path.home()
        data_dir = home / ".local" / "share" / "com.yanstu.filmtrack"
        paths.append(data_dir / "filmtrack.db")
    
    return paths

def main():
    print("FilmTrack 数据库清理工具")
    print("=" * 40)
    
    database_paths = get_database_paths()
    deleted_count = 0
    
    for db_path in database_paths:
        if db_path.exists():
            print(f"发现数据库文件: {db_path}")
            try:
                db_path.unlink()
                print(f"✓ 已删除: {db_path}")
                deleted_count += 1
            except Exception as e:
                print(f"✗ 删除失败: {db_path} - {e}")
        else:
            print(f"未找到: {db_path}")
    
    print("\n" + "=" * 40)
    if deleted_count > 0:
        print(f"成功删除了 {deleted_count} 个数据库文件")
        print("重新启动应用程序将自动创建新的数据库结构")
    else:
        print("未找到需要删除的数据库文件")
    
    print("\n注意：删除数据库将清空所有电影记录数据！")

if __name__ == "__main__":
    main() 