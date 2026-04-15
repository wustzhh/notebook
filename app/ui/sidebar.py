from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QPushButton, 
    QLabel, QScrollArea, QWidget, QListWidget, QListWidgetItem
)
from PyQt6.QtCore import Qt, QPropertyAnimation

from .styles import *
from app.core.models import Project, Tag


class SideBar(QFrame):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.setObjectName("sidebar")
        self.setFixedWidth(SIDEBAR_WIDTH)
        self.is_expanded = True
        
        self.setup_ui()
        self.load_data()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll_area.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        
        container = QWidget()
        self.container_layout = QVBoxLayout(container)
        self.container_layout.setContentsMargins(0, 0, 0, 0)
        self.container_layout.setSpacing(0)
        
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
                padding: 10px 16px;
                border-radius: 3px;
                margin: 2px 4px;
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
        
        heading2 = QLabel("标签")
        heading2.setObjectName("sidebarHeading")
        self.container_layout.addWidget(heading2)
        
        self.tag_list = QListWidget()
        self.tag_list.setStyleSheet(f"""
            QListWidget {{
                background-color: transparent;
                border: none;
                outline: none;
            }}
            QListWidget::item {{
                padding: 10px 16px;
                border-radius: 3px;
                margin: 2px 4px;
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
        self.container_layout.addWidget(self.tag_list)
        
        scroll_area.setWidget(container)
        layout.addWidget(scroll_area)
    
    def load_data(self):
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
        
        self.tag_list.clear()
        tags = Tag.get_all()
        for tag in tags:
            item = QListWidgetItem(f"# {tag.name}")
            item.setData(Qt.ItemDataRole.UserRole, tag.id)
            self.tag_list.addItem(item)
    
    def on_project_selected(self, item):
        project_id = item.data(Qt.ItemDataRole.UserRole)
        if project_id:
            self.main_window.set_current_project(project_id)
    
    def toggle(self):
        self.is_expanded = not self.is_expanded
        
        if self.is_expanded:
            target_width = SIDEBAR_WIDTH
            self.container_layout.parentWidget().setVisible(True)
        else:
            target_width = SIDEBAR_COLLAPSED_WIDTH
            self.container_layout.parentWidget().setVisible(False)
        
        self.animation = QPropertyAnimation(self, b"maximumWidth")
        self.animation.setDuration(200)
        self.animation.setEndValue(target_width)
        self.animation.start()
