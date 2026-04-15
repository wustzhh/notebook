import sys
import os

app_path = os.path.dirname(os.path.abspath(__file__))
project_path = os.path.dirname(app_path)
sys.path.insert(0, project_path)

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

from app.ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)
    
    app.setApplicationName("个人记事本")
    app.setOrganizationName("Personal")
    
    font = QFont("Microsoft YaHei", 10)
    app.setFont(font)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
