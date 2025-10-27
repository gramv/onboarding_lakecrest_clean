"""
Repository Package - Database Abstraction Layer

This package implements the Repository Pattern for clean separation between
business logic and data access.
"""

from .base_repository import DatabaseRepository
from .postgres_repository import PostgresRepository

__all__ = ['DatabaseRepository', 'PostgresRepository']

