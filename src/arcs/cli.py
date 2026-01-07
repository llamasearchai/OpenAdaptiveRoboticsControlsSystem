import json
from typing import Optional

import typer

from arcs.config import ConfigIO, TrainingConfig


app = typer.Typer()


@app.command("config-show")
def config_show(path: Optional[str] = None) -> None:
    """Print configuration (JSON)."""
    config = ConfigIO.load(path) if path else TrainingConfig()
    typer.echo(json.dumps(config.to_dict(), indent=2))


@app.command("config-save")
def config_save(path: str) -> None:
    """Write default configuration to file."""
    config = TrainingConfig()
    ConfigIO.save(config, path)
