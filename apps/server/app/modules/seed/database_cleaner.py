from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.shared.database import Base


def clear_application_tables(db: Session) -> None:
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(delete(table))

    db.commit()
