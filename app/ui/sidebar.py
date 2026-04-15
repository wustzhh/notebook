from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QListWidget, QListWidgetItem,
    QPushButton, QLabel, QScrollArea, QWidget
)
from PyQt6.QtCore import Qt, QPropertyAnimation
from PyQt6.QtGui import QFont

from app.core.models import Project, Tag


class SideBar(QFrame):
    def __init__(self):
        super().__init__()
        self.setFixedWidth(250)
        self.setMinimumWidth(60)
        self.setMaximumWidth(300)
        self.is_expanded = True
        
        self.setStyleSheet("""
            QFrame {
                background-color: #f8f9fa;
                border-right: 1px solid #ddd;
            }
            QListWidget {
                background-color: transparent;
                border: none;
                outline: none;
            }
            QListWidget::item {
                padding: 8px 16px;
                border-radius: 4px;
                margin: 2px 8px;
            }
            QListWidget::item:hover {
                background-color: #e9ecef;
            }
            QListWidget::item:selected {
                background-color: #4A90D9;
                color: white;
            }
            QLabel {
                color: #666;
                font-size: 12px;
                padding: 8px 16px 4px;
            }
            QPushButton {
                background-color: transparent;
                color: #666;
                border: none;
                padding: 4px 16px;
                text-align: left;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #e9ecef;
            }
        """)
        
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
        self.container_layout.setContentsMargins(0, 8, 0, 8)
        self.container_layout.setSpacing(0)
        
        self.projects_label = QLabel("PROJECTS")
        self.projects_label.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        self.container_layout.addWidget(self.projects_label)
        
        self.project_list = QListWidget()
        self.project_list.setFixedHeight(150)
        self.container_layout.addWidget(self.project_list)
        
        self.add_project_btn = QPushButton("+ 新建项目")
        self.container_layout.addWidget(self.add_project_btn)
        
        self.tags_label = QLabel("TAGS")
        self.tags_label.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        self.container_layout.addWidget(self.tags_label)
        
        self.tag_list = QListWidget()
        self.tag_list.setFixedHeight(120)
        self.container_layout.addWidget(self.tag_list)
        
        self.status_label = QLabel("STATUS")
        self.status_label.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        self.container_layout.addWidget(self.status_label)
        
        self.status_list = QListWidget()
        self.status_list.setFixedHeight(110)
        self.status_list.addItems(["● 待开始", "● 进行中", "● 已完成"])
        self.container_layout.addWidget(self.status_list)
        
        self.container_layout.addStretch()
        
        scroll_area.setWidget(container)
        layout.addWidget(scroll_area)
        
        self.toggle_btn = QPushButton(" 折叠")
        self.toggle_btn.setFixedHeight(40)
        self.toggle_btn.clicked.connect(self.toggle)
        layout.addWidget(self.toggle_btn)
    
    def load_data(self):
        self.project_list.clear()
        projects = Project.get_all()
        for project in projects:
            item = QListWidgetItem(f"● {project.name}")
            item.setData(Qt.ItemDataRole.UserRole, project.id)
            self.project_list.addItem(item)
        
        self.tag_list.clear()
        tags = Tag.get_all()
        for tag in tags:
            item = QListWidgetItem(f"● {tag.name}")
            item.setData(Qt.ItemDataRole.UserRole, tag.id)
            self.tag_list.addItem(item)
    
    def toggle(self):
        self.is_expanded = not self.is_expanded
        
        if self.is_expanded:
            target_width = 250
            self.toggle_btn.setText(" 折叠")
        else:
            target_width = 60
            self.toggle_btn.setText("▶")
        
        self.animation = QPropertyAnimation(self, b"maximumWidth")
        self.animation.setDuration(200)
        self.animation.setEndValue(target_width)
        self.animation.start()
        
        for widget in self.findChildren((QLabel, QListWidgetItem)):
            if hasattr(widget, 'setVisible'):
                widget.setVisible(self.is_expanded)
