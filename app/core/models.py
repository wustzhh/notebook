from datetime import datetime
from .database import Database


class Project:
    def __init__(self, id=None, name="", color="#4A90D9"):
        self.id = id
        self.name = name
        self.color = color
        self.created_at = None
        self.updated_at = None
    
    @classmethod
    def from_row(cls, row):
        if row is None:
            return None
        project = cls(
            id=row['id'],
            name=row['name'],
            color=row['color']
        )
        project.created_at = row['created_at']
        project.updated_at = row['updated_at']
        return project
    
    def save(self):
        db = Database()
        if self.id is None:
            cursor = db.execute(
                "INSERT INTO projects (name, color) VALUES (?, ?)",
                (self.name, self.color)
            )
            self.id = cursor.lastrowid
        else:
            db.execute(
                "UPDATE projects SET name=?, color=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (self.name, self.color, self.id)
            )
        return self
    
    def delete(self):
        if self.id:
            db = Database()
            db.execute("DELETE FROM projects WHERE id=?", (self.id,))
    
    @classmethod
    def get_all(cls):
        db = Database()
        rows = db.fetchall("SELECT * FROM projects ORDER BY created_at")
        return [cls.from_row(row) for row in rows]
    
    @classmethod
    def get_by_id(cls, id):
        db = Database()
        row = db.fetchone("SELECT * FROM projects WHERE id=?", (id,))
        return cls.from_row(row)


class Task:
    def __init__(self, id=None, title="", description="", project_id=None, 
                 parent_id=None, status="todo", start_date=None, end_date=None, position=0):
        self.id = id
        self.title = title
        self.description = description
        self.project_id = project_id
        self.parent_id = parent_id
        self.status = status
        self.start_date = start_date
        self.end_date = end_date
        self.position = position
        self.subtasks = []
        self.tags = []
        self.is_expanded = True
        self.created_at = None
        self.updated_at = None
    
    @classmethod
    def from_row(cls, row):
        if row is None:
            return None
        task = cls(
            id=row['id'],
            title=row['title'],
            description=row['description'],
            project_id=row['project_id'],
            parent_id=row['parent_id'],
            status=row['status'],
            start_date=row['start_date'],
            end_date=row['end_date'],
            position=row['position']
        )
        task.created_at = row['created_at']
        task.updated_at = row['updated_at']
        return task
    
    def save(self):
        db = Database()
        if self.id is None:
            max_pos = db.fetchone(
                "SELECT MAX(position) FROM tasks WHERE project_id=? AND parent_id=?",
                (self.project_id, self.parent_id)
            )[0] or -1
            self.position = max_pos + 1
            
            cursor = db.execute(
                """INSERT INTO tasks 
                   (title, description, project_id, parent_id, status, start_date, end_date, position) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (self.title, self.description, self.project_id, self.parent_id,
                 self.status, self.start_date, self.end_date, self.position)
            )
            self.id = cursor.lastrowid
        else:
            db.execute(
                """UPDATE tasks 
                   SET title=?, description=?, status=?, start_date=?, end_date=?, 
                       updated_at=CURRENT_TIMESTAMP 
                   WHERE id=?""",
                (self.title, self.description, self.status, self.start_date, 
                 self.end_date, self.id)
            )
        return self
    
    def delete(self):
        if self.id:
            db = Database()
            db.execute("DELETE FROM tasks WHERE id=?", (self.id,))
    
    def get_subtasks(self):
        db = Database()
        rows = db.fetchall(
            "SELECT * FROM tasks WHERE parent_id=? ORDER BY position",
            (self.id,)
        )
        return [Task.from_row(row) for row in rows]
    
    def has_subtasks(self):
        db = Database()
        row = db.fetchone(
            "SELECT COUNT(*) FROM tasks WHERE parent_id=?",
            (self.id,)
        )
        return row[0] > 0
    
    @classmethod
    def get_by_project(cls, project_id):
        db = Database()
        rows = db.fetchall(
            "SELECT * FROM tasks WHERE project_id=? AND parent_id IS NULL ORDER BY position",
            (project_id,)
        )
        tasks = [cls.from_row(row) for row in rows]
        for task in tasks:
            task.subtasks = task.get_subtasks()
        return tasks
    
    @classmethod
    def get_by_id(cls, id):
        db = Database()
        row = db.fetchone("SELECT * FROM tasks WHERE id=?", (id,))
        task = cls.from_row(row)
        if task:
            task.subtasks = task.get_subtasks()
            task.tags = task.get_tags()
        return task
    
    def get_tags(self):
        db = Database()
        rows = db.fetchall(
            """SELECT t.* FROM tags t 
               JOIN task_tags tt ON t.id = tt.tag_id 
               WHERE tt.task_id=?""",
            (self.id,)
        )
        return [{"id": row['id'], "name": row['name'], "color": row['color']} for row in rows]
    
    def set_tags(self, tag_ids):
        db = Database()
        db.execute("DELETE FROM task_tags WHERE task_id=?", (self.id,))
        for tag_id in tag_ids:
            db.execute("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)", 
                      (self.id, tag_id))


class Tag:
    def __init__(self, id=None, name="", color="#808080"):
        self.id = id
        self.name = name
        self.color = color
    
    @classmethod
    def from_row(cls, row):
        if row is None:
            return None
        return cls(id=row['id'], name=row['name'], color=row['color'])
    
    def save(self):
        db = Database()
        if self.id is None:
            cursor = db.execute(
                "INSERT INTO tags (name, color) VALUES (?, ?)",
                (self.name, self.color)
            )
            self.id = cursor.lastrowid
        else:
            db.execute(
                "UPDATE tags SET name=?, color=? WHERE id=?",
                (self.name, self.color, self.id)
            )
        return self
    
    def delete(self):
        if self.id:
            db = Database()
            db.execute("DELETE FROM tags WHERE id=?", (self.id,))
    
    @classmethod
    def get_all(cls):
        db = Database()
        rows = db.fetchall("SELECT * FROM tags ORDER BY name")
        return [cls.from_row(row) for row in rows]
