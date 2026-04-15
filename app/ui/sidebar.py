from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QPushButton, 
    QLabel, QScrollArea, QWidget, QListWidget, QListWidgetItem,
    QSpacerItem, QSizePolicy
)
from PyQt6.QtCore import Qt, QPropertyAnimation, pyqtSignal
from PyQt6.QtGui import QFont

from .styles import *
from app.core.models import Project


class SideBar(QFrame):
    item_selected = pyqtSignal(int)
    
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.setObjectName("sidebar")
        self.setFixedWidth(SIDEBAR_WIDTH)
        self.setMinimumWidth(SIDEBAR_COLLAPSED_WIDTH)
        self.setMaximumWidth(SIDEBAR_WIDTH)
        self.is_expanded = True
        
        self.setup_ui()
        self.load_projects()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll_area.setStyleSheet(f"QScrollArea {{ border: none; background-color: transparent; }}")
        
        container = QWidget()
        self.container_layout = QVBoxLayout(container)
        self.container_layout.setContentsMargins(8, 8, 8, 16)
        self.container_layout.setSpacing(4)
        
        self.nav_items = [
            ("📊", "仪表盘"),
            ("📋", "我的任务"),
            ("🔍", "筛选器"),
        ]
        
        for icon, text in self.nav_items:
            btn = self.create_nav_button(icon, text)
            self.container_layout.addWidget(btn)
        
        self.container_layout.addSpacing(16)
        
        heading = QLabel("项目")
        heading.setObjectName("sidebarHeading")
        self.container_layout.addWidget(heading)
        
        self.project_list = QListWidget()
        self.project_list.setStyleSheet(f"""
            QListWidget {{
                background-color: transparent;
                border: none;
                outline: none;
            }}
            QListWidget::item {{
                padding: 8px 12px;
                border-radius: 3px;
                margin: 2px 0;
                color: {NEUTRAL_100};
            }}
            QListWidget::item:hover {{
                background-color: {NEUTRAL_20};
            }}
            QListWidget::item:selected {{
                background-color: {PRIMARY_LIGHT};
                color: {PRIMARY};
            }}
        """)
        self.project_list.itemClicked.connect(self.on_project_selected)
        self.container_layout.addWidget(self.project_list)
        
        self.add_project_btn = QPushButton("+ 创建项目")
        self.add_project_btn.setObjectName("sidebarItem")
        self.add_project_btn.setStyleSheet(f"""
            QPushButton {{
                color: {NEUTRAL_70};
                font-style: italic;
            }}
            QPushButton:hover {{
                color: {PRIMARY};
            }}
        """)
        self.container_layout.addWidget(self.add_project_btn)
        
        self.container_layout.addSpacing(16)
        
        heading2 = QLabel("收藏的筛选器")
        heading2.setObjectName("sidebarHeading")
        self.container_layout.addWidget(heading2)
        
        self.filter_items = [
            ("📌", "最近查看的问题"),
            ("✓", "我的待办事项"),
            ("⏰", "逾期问题"),
        ]
        
        for icon, text in self.filter_items:
            btn = self.create_nav_button(icon, text)
            self.container_layout.addWidget(btn)
        
        self.container_layout.addStretch()
        
        scroll_area.setWidget(container)
        layout.addWidget(scroll_area)
    
    def create_nav_button(self, icon, text):
        btn = QPushButton(f"{icon}  {text}")
        btn.setObjectName("sidebarItem")
        btn.setFixedHeight(40)
        btn.setCursor(Qt.CursorShape.PointingHandCursor)
        return btn
    
    def load_projects(self):
        self.project_list.clear()
        projects = Project.get_all()
        for project in projects:
            item = QListWidgetItem(f"📁 {project.name}")
            item.setData(Qt.ItemDataRole.UserRole, project.id)
            self.project_list.addItem(item)
        
        if not projects:
            default_project = Project(name="默认项目")
            default_project.save()
            item = QListWidgetItem(f"📁 默认项目")
            item.setData(Qt.ItemDataRole.UserRole, default_project.id)
            self.project_list.addItem(item)
    
    def on_project_selected(self, item):
        project_id = item.data(Qt.ItemDataRole.UserRole)
        if project_id:
            self.main_window.set_current_project(project_id)
    
    def toggle(self):
        self.is_expanded = not self.is_expanded
        
        if self.is_expanded:
            target_width = SIDEBAR_WIDTH
            for widget in self.findChildren((QLabel, QPushButton, QListWidget)):
                widget.setVisible(True)
        else:
            target_width = SIDEBAR_COLLAPSED_WIDTH
            for widget in self.findChildren((QLabel, QPushButton, QListWidget)):
                widget.setVisible(False)
        
        self.animation = QPropertyAnimation(self, b"maximumWidth")
        self.animation.setDuration(200)
        self.animation.setEndValue(target_width)
        self.animation.start()
