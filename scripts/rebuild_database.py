#!/usr/bin/env python3
"""
FilmTrack 数据库完全重建脚本
彻底清理数据库相关文件，确保应用重新创建正确的数据库结构
"""

import os
import sys
import shutil
from pathlib import Path

def get_all_database_paths():
    """获取所有可能的数据库相关文件路径"""
    paths = []
    
    # 当前目录下的数据库文件
    current_dir = Path.cwd()
    paths.extend([
        current_dir / "filmtrack.db",
        current_dir / "filmtrack.db-wal",
        current_dir / "filmtrack.db-shm",
        current_dir / "data" / "filmtrack.db",
        current_dir / "data" / "filmtrack.db-wal", 
        current_dir / "data" / "filmtrack.db-shm"
    ])
    
    # Windows用户数据目录
    if sys.platform == "win32":
        appdata = os.environ.get('APPDATA')
        if appdata:
            tauri_dir = Path(appdata) / "com.yanstu.filmtrack"
            paths.extend([
                tauri_dir / "filmtrack.db",
                tauri_dir / "filmtrack.db-wal",
                tauri_dir / "filmtrack.db-shm"
            ])
            
            # 清理整个应用数据目录
            if tauri_dir.exists():
                paths.append(tauri_dir)
    
    # macOS用户数据目录
    elif sys.platform == "darwin":
        home = Path.home()
        app_support = home / "Library" / "Application Support" / "com.yanstu.filmtrack"
        paths.extend([
            app_support / "filmtrack.db",
            app_support / "filmtrack.db-wal",
            app_support / "filmtrack.db-shm"
        ])
        if app_support.exists():
            paths.append(app_support)
    
    # Linux用户数据目录
    elif sys.platform == "linux":
        home = Path.home()
        data_dir = home / ".local" / "share" / "com.yanstu.filmtrack"
        paths.extend([
            data_dir / "filmtrack.db",
            data_dir / "filmtrack.db-wal",
            data_dir / "filmtrack.db-shm"
        ])
        if data_dir.exists():
            paths.append(data_dir)
    
    return paths

def force_delete(path):
    """强制删除文件或目录"""
    try:
        if path.is_file():
            # 尝试修改权限后删除
            try:
                path.chmod(0o777)
            except:
                pass
            path.unlink()
            return True
        elif path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
            return True
    except Exception as e:
        print(f"  警告: 无法删除 {path} - {e}")
        return False
    return False

def main():
    print("FilmTrack 数据库完全重建工具")
    print("=" * 50)
    print("警告: 此操作将删除所有数据库文件和应用数据！")
    print("请确保您已备份重要数据。")
    print()
    
    # 确认操作
    confirm = input("是否继续? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("操作已取消")
        return
    
    print("\n开始清理数据库文件...")
    database_paths = get_all_database_paths()
    deleted_count = 0
    
    for db_path in database_paths:
        if db_path.exists():
            print(f"发现文件/目录: {db_path}")
            if force_delete(db_path):
                print(f"✓ 已删除: {db_path}")
                deleted_count += 1
            else:
                print(f"✗ 删除失败: {db_path}")
        else:
            print(f"未找到: {db_path}")
    
    # 清理可能的临时文件
    temp_patterns = [
        "*.db-journal",
        "*.sqlite",
        "*.sqlite-wal", 
        "*.sqlite-shm"
    ]
    
    print(f"\n清理临时文件...")
    for pattern in temp_patterns:
        for temp_file in Path.cwd().glob(pattern):
            if force_delete(temp_file):
                print(f"✓ 已清理临时文件: {temp_file}")
                deleted_count += 1
    
    print("\n" + "=" * 50)
    print(f"清理完成! 共处理了 {deleted_count} 个项目")
    print("\n重要提醒:")
    print("1. 所有电影记录数据已被删除")
    print("2. 重新启动应用程序将自动创建新的数据库结构")
    print("3. 新的数据库将不再包含 watch_history 表")
    print("4. 所有索引和表结构将完全重建")
    print("\n建议操作:")
    print("1. 重启开发服务器")
    print("2. 清除浏览器缓存")
    print("3. 检查应用是否正常工作")

if __name__ == "__main__":
    main() 