import sys
import os

# Ensure src is in path so we can import arcs
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from arcs.cli import app


def main():
    """Application Entry Point."""
    app()


if __name__ == "__main__":
    main()
