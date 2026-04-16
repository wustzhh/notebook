from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QPushButton, QLineEdit, QLabel, QFrame, QScrollArea,
    QSizePolicy
)
from PyQt6.QtCore import Qt, QPropertyAnimation, QParallelAnimationGroup, QSequentialAnimationGroup
from PyQt6.QtGui import QFont

from .styles import *
from .sidebar import SideBar
from .task_view import TaskListView
from .task_detail import TaskDetailPanel
from .create_issue_dialog import CreateIssueDialog


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("个人记事本")
        self.setMinimumSize(1200, 800)
        self.setStyleSheet(get_main_stylesheet())
        
        self.current_project_id = None
        self.detail_expanded = False
        
        self.setup_ui()
        
    def setup_ui(self):
        central_widget = QWidget()
        central_widget.setObjectName("contentArea")
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        self.top_nav = self.create_top_navigation()
        main_layout.addWidget(self.top_nav)
        
        content_container = QHBoxLayout()
        content_container.setContentsMargins(0, 0, 0, 0)
        content_container.setSpacing(0)
        
        self.sidebar = SideBar(self)
        content_container.addWidget(self.sidebar)
        
        self.main_content = QWidget()
        self.main_content.setObjectName("contentArea")
        main_content_layout = QVBoxLayout(self.main_content)
        main_content_layout.setContentsMargins(0, 0, 0, 0)
        main_content_layout.setSpacing(0)
        
        self.page_header = self.create_page_header()
        main_content_layout.addWidget(self.page_header)
        
        self.task_list_view = TaskListView(self)
        main_content_layout.addWidget(self.task_list_view)
        
        content_container.addWidget(self.main_content, 1)
        
        self.detail_panel = TaskDetailPanel(self)
        self.detail_panel.setFixedWidth(0)
        content_container.addWidget(self.detail_panel)
        
        main_layout.addLayout(content_container)
    
    def create_top_navigation(self):
        top_nav = QFrame()
        top_nav.setObjectName("topNav")
        top_nav.setFixedHeight(HEADER_HEIGHT)
        
        layout = QHBoxLayout(top_nav)
        layout.setContentsMargins(0, 0, 0, 0)
        
        left_section = QHBoxLayout()
        
        menu_btn = QPushButton("☰")
        menu_btn.setObjectName("navBtn")
        menu_btn.setFixedSize(48, HEADER_HEIGHT)
        menu_btn.clicked.connect(self.toggle_sidebar)
        left_section.addWidget(menu_btn)
        
        logo_btn = QPushButton("📋 个人记事本")
        logo_btn.setObjectName("logoBtn")
        left_section.addWidget(logo_btn)
        
        layout.addLayout(left_section)
        layout.addSpacing(24)
        
        center_section = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setObjectName("searchInput")
        self.search_input.setPlaceholderText("搜索任务...")
        self.search_input.setFixedWidth(280)
        self.search_input.setFixedHeight(36)
        center_section.addWidget(self.search_input)
        
        layout.addLayout(center_section)
        layout.addStretch()
        
        right_section = QHBoxLayout()
        
        create_btn = QPushButton("+ 创建")
        create_btn.setObjectName("createBtn")
        create_btn.setFixedHeight(36)
        create_btn.clicked.connect(self.show_create_dialog)
        right_section.addWidget(create_btn)
        
        settings_btn = QPushButton("⚙️")
        settings_btn.setObjectName("navBtn")
        settings_btn.setFixedSize(40, 36)
        right_section.addWidget(settings_btn)
        
        layout.addLayout(right_section)
        
        return top_nav
    
    def create_page_header(self):
        page_header = QFrame()
        page_header.setObjectName("pageHeader")
        page_header.setFixedHeight(70)
        
        layout = QHBoxLayout(page_header)
        layout.setContentsMargins(24, 12, 24, 12)
        
        left_section = QVBoxLayout()
        left_section.setSpacing(4)
        
        breadcrumb = QLabel("项目 / 默认项目")
        breadcrumb.setObjectName("breadcrumb")
        left_section.addWidget(breadcrumb)
        
        title = QLabel("任务列表")
        title.setObjectName("pageTitle")
        left_section.addWidget(title)
        
        layout.addLayout(left_section)
        layout.addStretch()
        
        return page_header
    
    def toggle_sidebar(self):
        self.sidebar.toggle()
    
    def show_create_dialog(self):
        dialog = CreateIssueDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            task_data = dialog.get_task_data()
            self.task_list_view.create_task(task_data)
    
    def show_task_detail(self, task):
        if not self.detail_expanded:
            self.detail_expanded = True
            self._animate_detail_in()
        self.detail_panel.load_task(task)
    
    def close_task_detail(self):
        if self.detail_expanded:
            self.detail_expanded = False
            self._animate_detail_out()
    
    def _animate_detail_in(self):
        target_width = DETAIL_PANEL_WIDTH
        
        self.detail_panel.animation_in = QPropertyAnimation(self.detail_panel, b"maximumWidth")
        self.detail_panel.animation_in.setDuration(250)
        self.detail_panel.animation_in.setStartValue(0)
        self.detail_panel.animation_in.setEndValue(target_width)
        self.detail_panel.animation_in.start()
    
    def _animate_detail_out(self):
        self.detail_panel.animation_out = QPropertyAnimation(self.detail_panel, b"maximumWidth")
        self.detail_panel.animation_out.setDuration(250)
        self.detail_panel.animation_out.setStartValue(self.detail_panel.width())
        self.detail_panel.animation_out.setEndValue(0)
        self.detail_panel.animation_out.finished.connect(self.detail_panel.hide)
        self.detail_panel.animation_out.start()
    
    def set_current_project(self, project_id):
        self.current_project_id = project_id
        self.task_list_view.load_tasks(project_id)
