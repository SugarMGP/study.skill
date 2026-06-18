"""Diagram rendering through Kroki."""

from urllib.request import Request, urlopen


KROKI_ENDPOINT = "https://kroki.io"
KROKI_TYPES = {
    "plantuml": "plantuml",
    "puml": "plantuml",
    "graphviz": "graphviz",
    "dot": "graphviz",
    "d2": "d2",
    "vega-lite": "vegalite",
    "vegalite": "vegalite",
    "vega": "vega",
    "svgbob": "svgbob",
    "pikchr": "pikchr",
    "structurizr": "structurizr",
}


def render_diagram_svg(diagram_type: str, source: str) -> str:
    kroki_type = KROKI_TYPES.get(diagram_type.strip().lower())
    if not kroki_type or not source.strip():
        raise ValueError("invalid params: need supported type and source")

    request = Request(
        f"{KROKI_ENDPOINT}/{kroki_type}/svg",
        data=source.encode("utf-8"),
        headers={
            "Content-Type": "text/plain; charset=utf-8",
            "Accept": "image/svg+xml",
            "User-Agent": "study.skill-viewer/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")
