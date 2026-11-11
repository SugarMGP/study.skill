(function(global) {
  "use strict";

  const ARCHIFY_TYPES = new Set([
    "sequence",
    "workflow",
    "architecture",
    "dataflow",
    "lifecycle",
    "tree",
    "erd",
    "timeline",
    "waterfall"
  ]);

  const TONE_MAP = {
    frontend: "frontend",
    start: "frontend",
    active: "frontend",
    backend: "backend",
    success: "backend",
    action: "backend",
    recovery: "backend",
    database: "database",
    decision: "database",
    cloud: "cloud",
    waiting: "cloud",
    change: "cloud",
    security: "security",
    failure: "security",
    stop: "security",
    alert: "security",
    messagebus: "messagebus",
    external: "external",
    neutral: "external",
    default: "backend"
  };

  const SIGIL_PATHS = {
    frontend: '<rect x="2" y="3" width="12" height="10" rx="2"/><path d="M2 6.5h12"/><circle cx="4.2" cy="4.8" r="0.8" class="sigil-fill"/><circle cx="6.5" cy="4.8" r="0.8" class="sigil-fill"/>',
    backend: '<path d="M6 3 2.8 8 6 13M10 3l3.2 5L10 13"/>',
    database: '<ellipse cx="8" cy="4" rx="5" ry="2"/><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2"/>',
    cloud: '<path d="M4.3 12.5h7.3a2.4 2.4 0 0 0 .2-4.8 4 4 0 0 0-7.5-1.3A3.1 3.1 0 0 0 4.3 12.5Z"/>',
    security: '<path d="M8 2.2 13 4v3.5c0 3.1-1.8 5.4-5 6.5-3.2-1.1-5-3.4-5-6.5V4Z"/><path d="m5.8 8 1.5 1.5 3-3"/>',
    messagebus: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/><circle cx="5" cy="4.5" r="1.1" class="sigil-fill"/><circle cx="10.5" cy="8" r="1.1" class="sigil-fill"/><circle cx="7" cy="11.5" r="1.1" class="sigil-fill"/>',
    external: '<rect x="2.5" y="5" width="8.5" height="8" rx="1.5"/><path d="M8 2.5h5.5V8M13.5 2.5 7.5 8.5"/>',
    start: '<circle cx="8" cy="8" r="5.2"/><path d="m6.8 5.4 3.8 2.6-3.8 2.6Z" class="sigil-fill"/>',
    active: '<path d="M2 8h3l1.5-3.5L9 12l1.6-4H14"/>',
    waiting: '<path d="M4 2.5h8M4 13.5h8M5 3c0 2.8 2 3.2 3 5-1 1.8-3 2.2-3 5M11 3c0 2.8-2 3.2-3 5 1 1.8 3 2.2 3 5"/>',
    decision: '<path d="M8 2.2 13.8 8 8 13.8 2.2 8Z"/>',
    success: '<circle cx="8" cy="8" r="5.3"/><path d="m5.2 8 1.8 1.8 3.8-4"/>',
    failure: '<circle cx="8" cy="8" r="5.3"/><path d="m5.7 5.7 4.6 4.6m0-4.6-4.6 4.6"/>',
    stop: '<circle cx="8" cy="8" r="5.3"/><rect x="6.1" y="6.1" width="3.8" height="3.8" rx="0.5" class="sigil-fill"/>'
  };

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function charUnits(code) {
    if (
      (code >= 0x1100 && code <= 0x11ff) ||
      (code >= 0x2e80 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60)
    ) {
      return 1.9;
    }
    return 1;
  }

  function textUnits(str) {
    let units = 0;
    const text = String(str || "");
    for (let i = 0; i < text.length; i++) {
      units += charUnits(text.charCodeAt(i));
    }
    return Math.max(1, units);
  }

  function measureTextPx(str, fontSize) {
    const size = fontSize || 12;
    return Math.ceil(textUnits(str) * (size * 0.56));
  }

  // Split long node labels into at most 2 balanced lines so nodes stay compact
  function wrapNodeLabel(label, maxUnitsPerLine) {
    const text = String(label || "").trim();
    const limit = maxUnitsPerLine || 24;
    if (textUnits(text) <= limit) return [text];

    // Find split point near middle unit count, preferring punctuation/spaces
    const total = textUnits(text);
    const target = total / 2;
    let acc = 0;
    let bestIdx = Math.floor(text.length / 2);
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 1; i < text.length - 1; i++) {
      acc += charUnits(text.charCodeAt(i - 1));
      const ch = text[i];
      const isBreakChar = /[\s:：,，/(\uff08\-~]/.test(ch);
      const dist = Math.abs(acc - target) - (isBreakChar ? 3.5 : 0);
      if (dist < bestScore) {
        bestScore = dist;
        bestIdx = isBreakChar && ch === " " ? i + 1 : i;
      }
    }
    const line1 = text.slice(0, bestIdx).trim();
    const line2 = text.slice(bestIdx).trim();
    return line1 && line2 ? [line1, line2] : [text];
  }

  function normalizeTone(raw) {
    const key = String(raw || "backend").trim().toLowerCase();
    return TONE_MAP[key] || "backend";
  }

  function normalizeSigilKind(raw) {
    const key = String(raw || "backend").trim().toLowerCase();
    if (SIGIL_PATHS[key]) return key;
    return normalizeTone(key);
  }

  function parseHeaderKv(line) {
    const attrs = {};
    const regex = /([A-Za-z_][A-Za-z0-9_-]*)=("[^"]*"|'[^']*'|\S+)/g;
    let match;
    while ((match = regex.exec(String(line || ""))) !== null) {
      const key = match[1].toLowerCase();
      let val = match[2];
      if (val.length >= 2 && ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))) {
        val = val.slice(1, -1);
      }
      attrs[key] = val.trim();
    }
    return attrs;
  }

  function parsePipeRow(line) {
    let s = String(line || "").trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map(cell => cell.trim());
  }

  function parseArchifyBlock(rawText) {
    const lines = String(rawText || "")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"));
    if (lines.length === 0) {
      throw new Error("Empty archify diagram block");
    }
    const header = parseHeaderKv(lines[0]);
    const type = (header.type || "").toLowerCase();
    if (!ARCHIFY_TYPES.has(type)) {
      throw new Error("Unsupported or missing archify type: " + (header.type || "(none)"));
    }
    const rows = lines.slice(1).filter(l => l.includes("|")).map(parsePipeRow);
    const id = header.id || ("diag-" + type + "-" + rows.length);
    const title = header.title || id;
    if (rows.length === 0) {
      throw new Error("Archify diagram '" + id + "' has no pipe rows");
    }
    return { type, id, title, header, rows };
  }

  function parseStudyStepsBlock(rawText) {
    const lines = String(rawText || "")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"));
    if (lines.length === 0) {
      return { diagram: "", steps: [] };
    }
    const header = parseHeaderKv(lines[0]);
    const diagram = header.diagram || "";
    const steps = lines
      .slice(1)
      .filter(l => l.includes("|"))
      .map((line, idx) => {
        const cells = parsePipeRow(line);
        const stepId = cells[0] || ("step-" + (idx + 1));
        const title = cells[1] || stepId;
        const detail = cells[2] || "";
        const targets = (cells[3] || "")
          .split(",")
          .map(t => t.trim())
          .filter(Boolean);
        return { id: stepId, title, detail, targets };
      });
    return { diagram, steps };
  }

  function renderDefs() {
    return [
      "<defs>",
      '  <marker id="arch-arrow-default" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">',
      '    <polygon points="0 0, 9 3.5, 0 7" class="m-default"/>',
      "  </marker>",
      '  <marker id="arch-arrow-emphasis" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">',
      '    <polygon points="0 0, 9 3.5, 0 7" class="m-emphasis"/>',
      "  </marker>",
      '  <marker id="arch-arrow-security" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">',
      '    <polygon points="0 0, 9 3.5, 0 7" class="m-security"/>',
      "  </marker>",
      '  <marker id="arch-arrow-dashed" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">',
      '    <polygon points="0 0, 9 3.5, 0 7" class="m-dashed"/>',
      "  </marker>",
      "</defs>"
    ].join("\n");
  }

  function renderSigil(kind, x, y) {
    const sigilKind = normalizeSigilKind(kind);
    const tone = normalizeTone(kind);
    const paths = SIGIL_PATHS[sigilKind] || SIGIL_PATHS.backend;
    return '<g class="node-sigil s-' + esc(tone) + '" transform="translate(' + x + ',' + y + ') scale(0.78)" aria-hidden="true">' + paths + "</g>";
  }

  function edgeVariantProps(variant) {
    const v = String(variant || "default").trim().toLowerCase();
    if (v === "emphasis") return { cls: "a-emphasis", textCls: "t-edge-emphasis", marker: "url(#arch-arrow-emphasis)", dash: "" };
    if (v === "security") return { cls: "a-security", textCls: "t-edge-security", marker: "url(#arch-arrow-security)", dash: ' stroke-dasharray="5,4"' };
    if (v === "dashed") return { cls: "a-dashed", textCls: "t-edge-dashed", marker: "url(#arch-arrow-dashed)", dash: ' stroke-dasharray="4,4"' };
    if (v === "return") return { cls: "a-default", textCls: "t-edge-default", marker: "url(#arch-arrow-default)", dash: ' stroke-dasharray="4,4"' };
    return { cls: "a-default", textCls: "t-edge-default", marker: "url(#arch-arrow-default)", dash: "" };
  }

  function boxesOverlap(a, b, pad) {
    const p = pad || 0;
    return a.x - p < b.x + b.w && a.x + a.w + p > b.x && a.y - p < b.y + b.h && a.y + a.h + p > b.y;
  }

  function createLabelPlacer(nodes, extraObstacles) {
    const nodeBoxes = (nodes || []).map(n => ({ x: n.x, y: n.y, w: n.w, h: n.h }));
    const chipBoxes = (extraObstacles || []).slice();

    return {
      addObstacle(box) {
        chipBoxes.push(box);
      },
      placeChip(cx, cy, label, textCls, altAnchors) {
        if (!label) return { svg: "", box: null };
        const w = Math.max(36, measureTextPx(label, 11) + 16);
        const h = 20;

        const anchors = [[cx, cy]].concat(altAnchors || []);
        const offsets = [[0, 0]];
        const ySteps = [0, -18, 18, -32, 32, -46, 46, -62, 62, -78, 78, -96, 96, -116, 116, -138, 138];
        const xSteps = [0, -24, 24, -48, 48, -76, 76, -108, 108, -140, 140];
        for (const dy of ySteps) {
          for (const dx of xSteps) {
            if (dx !== 0 || dy !== 0) offsets.push([dx, dy]);
          }
        }

        let chosenX = cx;
        let chosenY = cy;
        let bestPenalty = Number.POSITIVE_INFINITY;

        outer:
        for (let aIdx = 0; aIdx < anchors.length; aIdx++) {
          const [ax, ay] = anchors[aIdx];
          for (const [dx, dy] of offsets) {
            const tx = Math.max(w / 2 + 8, ax + dx);
            const ty = Math.max(h / 2 + 8, ay + dy);
            const candBox = { x: tx - w / 2, y: ty - h / 2, w, h };

            let penalty = aIdx * 4;
            for (const nb of nodeBoxes) {
              if (boxesOverlap(candBox, nb, 3)) penalty += 8000;
            }
            for (const cb of chipBoxes) {
              if (boxesOverlap(candBox, cb, 3)) penalty += 3000;
            }
            penalty += Math.hypot(dx, dy) * 0.12;

            if (penalty < 15) {
              chosenX = tx;
              chosenY = ty;
              bestPenalty = penalty;
              break outer;
            }
            if (penalty < bestPenalty) {
              bestPenalty = penalty;
              chosenX = tx;
              chosenY = ty;
            }
          }
        }

        const finalBox = { x: chosenX - w / 2, y: chosenY - h / 2, w, h };
        chipBoxes.push(finalBox);

        const svg =
          '<rect x="' + finalBox.x.toFixed(1) + '" y="' + finalBox.y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h + '" rx="6" class="c-mask edge-chip"/>' +
          '<text x="' + chosenX.toFixed(1) + '" y="' + (chosenY + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="500" class="' + esc(textCls || "t-edge-default") + '">' + esc(label) + "</text>";
        return { svg, box: finalBox };
      },
      getBounds() {
        let maxX = 0;
        let maxY = 0;
        for (const b of nodeBoxes.concat(chipBoxes)) {
          if (b.x + b.w > maxX) maxX = b.x + b.w;
          if (b.y + b.h > maxY) maxY = b.y + b.h;
        }
        return { maxX, maxY };
      }
    };
  }

  function renderNodeBox(node, stepIndex) {
    const tone = normalizeTone(node.rawKind || node.tone);
    const x = node.x;
    const y = node.y;
    const w = node.w;
    const h = node.h;
    const isDecision = Boolean(node.isDecision);
    const shape = isDecision
      ? '<polygon points="' +
        (x + w / 2).toFixed(1) + "," + y.toFixed(1) + " " +
        (x + w).toFixed(1) + "," + (y + h / 2).toFixed(1) + " " +
        (x + w / 2).toFixed(1) + "," + (y + h).toFixed(1) + " " +
        x.toFixed(1) + "," + (y + h / 2).toFixed(1) +
        '" class="c-' + esc(tone) + ' node-shape"/>'
      : '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="9" class="c-' + esc(tone) + ' node-shape"/>';

    const maskShape = isDecision
      ? '<polygon points="' +
        (x + w / 2).toFixed(1) + "," + y.toFixed(1) + " " +
        (x + w).toFixed(1) + "," + (y + h / 2).toFixed(1) + " " +
        (x + w / 2).toFixed(1) + "," + (y + h).toFixed(1) + " " +
        x.toFixed(1) + "," + (y + h / 2).toFixed(1) +
        '" class="c-mask"/>'
      : '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="9" class="c-mask"/>';

    const sigil = isDecision ? "" : renderSigil(node.rawKind || node.tone, x + 8, y + 7);
    const lines = Array.isArray(node.lines) && node.lines.length > 0 ? node.lines : [node.label];
    const textX = (x + w / 2 + (isDecision ? 0 : 4)).toFixed(1);

    let textSvg = "";
    if (lines.length === 1) {
      const textY = node.sublabel ? y + h / 2 - 2 : y + h / 2 + 4.5;
      textSvg = '<text x="' + textX + '" y="' + textY.toFixed(1) + '" text-anchor="middle" font-size="12.5" font-weight="600" class="t-primary">' + esc(lines[0]) + "</text>";
    } else {
      const y1 = y + h / 2 - 4;
      const y2 = y + h / 2 + 13;
      textSvg =
        '<text x="' + textX + '" y="' + y1.toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="600" class="t-primary">' + esc(lines[0]) + "</text>" +
        '<text x="' + textX + '" y="' + y2.toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="600" class="t-primary">' + esc(lines[1]) + "</text>";
    }

    const sublabelSvg = node.sublabel
      ? '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y + h - 7).toFixed(1) + '" text-anchor="middle" font-size="10" class="t-muted">' + esc(node.sublabel) + "</text>"
      : "";

    return (
      '<g data-node-id="' + esc(node.id) + '" data-node-label="' + esc(node.label) + '" data-node-kind="' + esc(tone) + '" style="--step:' + (stepIndex || 0) + '">' +
      "<title>" + esc(node.label + (node.sublabel ? " · " + node.sublabel : "")) + "</title>" +
      maskShape +
      shape +
      sigil +
      textSvg +
      sublabelSvg +
      "</g>"
    );
  }

  function hasIntermediateHorizontalBlocker(fromNode, toNode, allNodes) {
    if (Math.abs((fromNode.y + fromNode.h / 2) - (toNode.y + toNode.h / 2)) > 36) return false;
    const minX = Math.min(fromNode.x + fromNode.w, toNode.x + toNode.w);
    const maxX = Math.max(fromNode.x, toNode.x);
    if (maxX - minX < 20) return false;
    const rowY = (fromNode.y + fromNode.h / 2 + toNode.y + toNode.h / 2) / 2;
    return allNodes.some(n => {
      if (n.id === fromNode.id || n.id === toNode.id) return false;
      const nxCenter = n.x + n.w / 2;
      const nyCenter = n.y + n.h / 2;
      return nxCenter > minX - 10 && nxCenter < maxX + 10 && Math.abs(nyCenter - rowY) < 38;
    });
  }

  function renderSmartEdge(edge, fromNode, toNode, index, context) {
    const vp = edgeVariantProps(edge.variant);
    const allNodes = (context && context.nodes) || [];
    const placer = context && context.placer;
    const pairOffset = (context && context.pairOffset) || 0;
    const bypassSlot = (context && context.bypassSlot) || 0;

    const fx = fromNode.x + fromNode.w / 2;
    const fy = fromNode.y + fromNode.h / 2;
    const tx = toNode.x + toNode.w / 2;
    const ty = toNode.y + toNode.h / 2;
    const dx = tx - fx;
    const dy = ty - fy;

    let d = "";
    let lx = (fx + tx) / 2;
    let ly = (fy + ty) / 2;
    let altAnchors = [];

    const blockedHorizontally = hasIntermediateHorizontalBlocker(fromNode, toNode, allNodes);

    if (blockedHorizontally) {
      const goBelow = dx < 0 || (bypassSlot % 2 === 1);
      const rank = Math.floor(bypassSlot / 2);
      if (!goBelow) {
        const sy = fromNode.y;
        const ey = toNode.y;
        const archY = Math.max(14, Math.min(sy, ey) - 34 - rank * 26);
        d = "M " + fx.toFixed(1) + " " + sy.toFixed(1) +
            " C " + fx.toFixed(1) + " " + archY.toFixed(1) + ", " +
            tx.toFixed(1) + " " + archY.toFixed(1) + ", " +
            tx.toFixed(1) + " " + ey.toFixed(1);
        lx = (fx + tx) / 2;
        ly = archY + 6;
      } else {
        const sy = fromNode.y + fromNode.h;
        const ey = toNode.y + toNode.h;
        const archY = Math.max(sy, ey) + 36 + rank * 26;
        d = "M " + fx.toFixed(1) + " " + sy.toFixed(1) +
            " C " + fx.toFixed(1) + " " + archY.toFixed(1) + ", " +
            tx.toFixed(1) + " " + archY.toFixed(1) + ", " +
            tx.toFixed(1) + " " + ey.toFixed(1);
        lx = (fx + tx) / 2;
        ly = archY - 6;
      }
    } else if (Math.abs(dx) >= Math.abs(dy) * 0.75) {
      const dir = dx >= 0 ? 1 : -1;
      const portShiftY = pairOffset * 11;
      const sx = dir > 0 ? fromNode.x + fromNode.w : fromNode.x;
      const sy = fy + portShiftY;
      const ex = dir > 0 ? toNode.x : toNode.x + toNode.w;
      const ey = ty + portShiftY;
      const mx = (sx + ex) / 2;

      if (pairOffset !== 0 && Math.abs(sy - ey) < 20) {
        const curveBulge = pairOffset * 24;
        const cy = (sy + ey) / 2 + curveBulge;
        d = "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
            " Q " + mx.toFixed(1) + " " + cy.toFixed(1) + " " +
            ex.toFixed(1) + " " + ey.toFixed(1);
        lx = mx;
        ly = (sy + ey) / 2 + curveBulge * 0.75;
      } else if (Math.abs(sy - ey) < 4) {
        d = "M " + sx.toFixed(1) + " " + sy.toFixed(1) + " L " + ex.toFixed(1) + " " + ey.toFixed(1);
        lx = mx;
        ly = sy - 14;
      } else {
        d = "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
            " C " + mx.toFixed(1) + " " + sy.toFixed(1) + ", " +
            mx.toFixed(1) + " " + ey.toFixed(1) + ", " +
            ex.toFixed(1) + " " + ey.toFixed(1);
        lx = mx;
        ly = (sy + ey) / 2;
      }
      altAnchors = [
        [sx + (ex - sx) * 0.34, sy + (ey - sy) * 0.25],
        [sx + (ex - sx) * 0.66, sy + (ey - sy) * 0.75]
      ];
    } else {
      const dir = dy >= 0 ? 1 : -1;
      const portShiftX = pairOffset * 14;
      const sx = fx + portShiftX;
      const sy = dir > 0 ? fromNode.y + fromNode.h : fromNode.y;
      const ex = tx + portShiftX;
      const ey = dir > 0 ? toNode.y : toNode.y + toNode.h;
      const my = (sy + ey) / 2;

      if (pairOffset !== 0 && Math.abs(sx - ex) < 20) {
        const curveBulge = pairOffset * 32;
        const cx = (sx + ex) / 2 + curveBulge;
        d = "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
            " Q " + cx.toFixed(1) + " " + my.toFixed(1) + " " +
            ex.toFixed(1) + " " + ey.toFixed(1);
        lx = (sx + ex) / 2 + curveBulge * 0.75;
        ly = my;
      } else {
        d = "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
            " C " + sx.toFixed(1) + " " + my.toFixed(1) + ", " +
            ex.toFixed(1) + " " + my.toFixed(1) + ", " +
            ex.toFixed(1) + " " + ey.toFixed(1);
        lx = (sx + ex) / 2;
        ly = my;
      }
      altAnchors = [
        [sx + (ex - sx) * 0.25, sy + (ey - sy) * 0.34],
        [sx + (ex - sx) * 0.75, sy + (ey - sy) * 0.66]
      ];
    }

    const edgeId = edge.id || (edge.from + "-to-" + edge.to + "-" + (index + 1));
    const chipSvg = placer
      ? placer.placeChip(lx, ly, edge.label, vp.textCls, altAnchors).svg
      : "";

    return (
      '<g data-edge-id="' + esc(edgeId) + '" data-edge-from="' + esc(edge.from) + '" data-edge-to="' + esc(edge.to) + '" style="--step:' + (index || 0) + '">' +
      '<path d="' + d + '" class="edge-line ' + vp.cls + '" stroke-width="1.65" fill="none" marker-end="' + vp.marker + '"' + vp.dash + "/>" +
      chipSvg +
      "</g>"
    );
  }

  function renderEdgeSet(edges, byId, allNodes, placer) {
    const pairCounts = new Map();
    const pairSeen = new Map();
    edges.forEach(e => {
      const key = [e.from, e.to].sort().join("::");
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    });

    let bypassCounter = 0;
    const svgParts = [];
    edges.forEach((edge, idx) => {
      const fn = byId.get(edge.from);
      const tn = byId.get(edge.to);
      if (!fn || !tn) return;
      const pairKey = [edge.from, edge.to].sort().join("::");
      const total = pairCounts.get(pairKey) || 1;
      const seen = pairSeen.get(pairKey) || 0;
      pairSeen.set(pairKey, seen + 1);

      let pairOffset = 0;
      if (total > 1) {
        pairOffset = seen % 2 === 0 ? -1 : 1;
      }

      const blocked = hasIntermediateHorizontalBlocker(fn, tn, allNodes);
      const bypassSlot = blocked ? (bypassCounter++) : 0;

      svgParts.push(
        renderSmartEdge(edge, fn, tn, idx, {
          nodes: allNodes,
          placer,
          pairOffset,
          bypassSlot
        })
      );
    });
    return svgParts.join("\n");
  }

  // 1. Sequence Renderer
  function compileSequence(parsed) {
    const participants = [];
    const byId = new Map();
    const byLabel = new Map();
    const messages = [];
    const phases = [];

    function ensureActor(idOrLabel, label, rawKind) {
      if (byId.has(idOrLabel)) return byId.get(idOrLabel);
      if (byLabel.has(idOrLabel)) return byLabel.get(idOrLabel);
      const id = String(idOrLabel).replace(/[^a-zA-Z0-9_-]/g, "_") || ("actor_" + (participants.length + 1));
      const actor = {
        id,
        label: label || idOrLabel,
        rawKind: rawKind || "backend",
        tone: normalizeTone(rawKind || "backend")
      };
      participants.push(actor);
      byId.set(actor.id, actor);
      byLabel.set(actor.label, actor);
      return actor;
    }

    for (const row of parsed.rows) {
      const first = row[0] || "";
      if (first.toLowerCase().startsWith("actor ")) {
        const actorId = first.slice(6).trim();
        ensureActor(actorId, row[1] || actorId, row[2] || "backend");
      }
    }

    for (const row of parsed.rows) {
      const first = row[0] || "";
      if (first.toLowerCase().startsWith("actor ")) continue;
      if (first.toLowerCase() === "phase") {
        phases.push({ label: row[1] || "阶段", startIdx: messages.length });
        continue;
      }
      if (row.length >= 3) {
        const fromActor = ensureActor(row[0], row[0], "frontend");
        const toActor = ensureActor(row[1], row[1], "backend");
        messages.push({
          id: fromActor.id + "-to-" + toActor.id + "-" + (messages.length + 1),
          from: fromActor.id,
          to: toActor.id,
          label: row[2] || "",
          variant: row[3] || "default"
        });
      }
    }

    const colCount = Math.max(1, participants.length);
    const boxWidths = participants.map(p => Math.max(116, measureTextPx(p.label, 12.5) + 38));
    const maxBoxW = Math.max(120, ...boxWidths);
    let colGap = Math.max(maxBoxW + 36, 176);

    messages.forEach(msg => {
      const fi = participants.findIndex(p => p.id === msg.from);
      const ti = participants.findIndex(p => p.id === msg.to);
      const span = Math.max(1, Math.abs(ti - fi));
      const needed = (measureTextPx(msg.label, 11) + 46) / span;
      if (needed > colGap) colGap = Math.min(310, Math.ceil(needed));
    });

    const marginX = 52;
    const canvasW = Math.max(620, marginX * 2 + (colCount - 1) * colGap + maxBoxW);
    const headerY = 28;
    const headerH = 44;

    participants.forEach((p, idx) => {
      p.w = boxWidths[idx];
      p.h = headerH;
      p.cx = marginX + maxBoxW / 2 + idx * colGap;
      p.x = p.cx - p.w / 2;
      p.y = headerY;
    });

    let curY = headerY + headerH + 42;
    const phaseBands = [];
    const phaseStartMap = new Map();
    phases.forEach((ph, idx) => {
      phaseStartMap.set(ph.startIdx, { label: ph.label, idx });
    });

    let activeBand = null;
    messages.forEach((msg, idx) => {
      if (phaseStartMap.has(idx)) {
        if (activeBand) {
          activeBand.endY = curY - 16;
          phaseBands.push(activeBand);
        }
        const ph = phaseStartMap.get(idx);
        activeBand = { label: ph.label, startY: curY - 14, endY: curY + 34 };
        curY += 24;
      }
      msg.y = curY;
      curY += 52;
    });
    if (activeBand) {
      activeBand.endY = curY - 18;
      phaseBands.push(activeBand);
    }

    const canvasH = Math.max(240, curY + 26);
    const parts = [renderDefs()];
    const placer = createLabelPlacer(participants, []);

    phaseBands.forEach((band, idx) => {
      const bx = 24;
      const bw = canvasW - 48;
      const bh = Math.max(38, band.endY - band.startY);
      const chipW = Math.max(64, measureTextPx(band.label, 10.5) + 20);
      const chipBox = { x: bx + 10, y: band.startY - 9, w: chipW, h: 18 };
      placer.addObstacle(chipBox);
      parts.push(
        '<g class="seq-phase" data-phase-index="' + idx + '">' +
        '<rect x="' + bx + '" y="' + band.startY + '" width="' + bw + '" height="' + bh + '" rx="8" class="c-lane" stroke-width="1"/>' +
        '<rect x="' + chipBox.x + '" y="' + chipBox.y + '" width="' + chipW + '" height="18" rx="5" class="c-mask phase-chip"/>' +
        '<text x="' + (chipBox.x + chipW / 2) + '" y="' + (band.startY + 4) + '" text-anchor="middle" font-size="10.5" font-weight="600" class="t-muted">' + esc(band.label) + "</text>" +
        "</g>"
      );
    });

    participants.forEach(p => {
      parts.push(
        '<line x1="' + p.cx.toFixed(1) + '" y1="' + (headerY + headerH) + '" x2="' + p.cx.toFixed(1) + '" y2="' + (canvasH - 18) + '" class="c-lane-rule" stroke-width="1.25" stroke-dasharray="5,5"/>'
      );
    });

    participants.forEach((p, idx) => {
      parts.push(renderNodeBox(p, idx));
    });

    messages.forEach((msg, idx) => {
      const fromP = byId.get(msg.from);
      const toP = byId.get(msg.to);
      if (!fromP || !toP) return;
      const vp = edgeVariantProps(msg.variant);
      if (fromP.id === toP.id) {
        const x = fromP.cx;
        const y = msg.y;
        const loopW = 42;
        const d = "M " + x + " " + (y - 8) + " H " + (x + loopW) + " V " + (y + 12) + " H " + x;
        const chip = placer.placeChip(x + loopW + measureTextPx(msg.label, 11) / 2 + 14, y + 2, msg.label, vp.textCls);
        parts.push(
          '<g data-edge-id="' + esc(msg.id) + '" data-edge-from="' + esc(msg.from) + '" data-edge-to="' + esc(msg.to) + '" style="--step:' + idx + '">' +
          '<path d="' + d + '" class="edge-line ' + vp.cls + '" stroke-width="1.6" fill="none" marker-end="' + vp.marker + '"' + vp.dash + "/>" +
          chip.svg +
          "</g>"
        );
      } else {
        const x1 = fromP.cx;
        const x2 = toP.cx;
        const y = msg.y;
        const midX = (x1 + x2) / 2;
        const chip = placer.placeChip(midX, y - 12, msg.label, vp.textCls);
        parts.push(
          '<g data-edge-id="' + esc(msg.id) + '" data-edge-from="' + esc(msg.from) + '" data-edge-to="' + esc(msg.to) + '" style="--step:' + idx + '">' +
          '<line x1="' + x1.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="edge-line ' + vp.cls + '" stroke-width="1.65" marker-end="' + vp.marker + '"' + vp.dash + "/>" +
          chip.svg +
          "</g>"
        );
      }
    });

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  function assignTopologicalRanks(nodes, edges, explicitColMap) {
    const idSet = new Set(nodes.map(n => n.id));
    const indegree = new Map(nodes.map(n => [n.id, 0]));
    const adj = new Map(nodes.map(n => [n.id, []]));
    edges.forEach(e => {
      if (idSet.has(e.from) && idSet.has(e.to) && e.from !== e.to) {
        adj.get(e.from).push(e.to);
        indegree.set(e.to, (indegree.get(e.to) || 0) + 1);
      }
    });

    const rank = new Map();
    const queue = [];
    nodes.forEach(n => {
      if (explicitColMap && explicitColMap.has(n.id)) {
        rank.set(n.id, explicitColMap.get(n.id));
      } else if ((indegree.get(n.id) || 0) === 0) {
        rank.set(n.id, 0);
        queue.push(n.id);
      }
    });

    if (queue.length === 0 && nodes.length > 0 && rank.size === 0) {
      rank.set(nodes[0].id, 0);
      queue.push(nodes[0].id);
    }

    const visited = new Set(queue);
    while (queue.length > 0) {
      const curr = queue.shift();
      const currRank = rank.get(curr) || 0;
      for (const next of adj.get(curr) || []) {
        if (!explicitColMap || !explicitColMap.has(next)) {
          rank.set(next, Math.max(rank.get(next) || 0, currRank + 1));
        }
        indegree.set(next, (indegree.get(next) || 1) - 1);
        if ((indegree.get(next) || 0) <= 0 && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    nodes.forEach((n, idx) => {
      if (!rank.has(n.id)) {
        rank.set(n.id, idx % 5);
      }
    });
    return rank;
  }

  function layoutGroupedArchitecture(groups, nodes, byId, edges) {
    const groupList = Array.from(groups.values());
    const ungrouped = nodes.filter(n => !n.containerId || !groups.has(n.containerId));
    const clusters = [];

    groupList.forEach(grp => {
      const members = nodes.filter(n => n.containerId === grp.id);
      if (members.length === 0) return;
      clusters.push({
        id: grp.id,
        label: grp.label,
        tone: grp.tone,
        isGroup: true,
        members
      });
    });

    ungrouped.forEach(n => {
      clusters.push({
        id: "__ungrouped_" + n.id,
        label: "",
        tone: n.tone,
        isGroup: false,
        members: [n]
      });
    });

    const memberToCluster = new Map();
    clusters.forEach(cl => {
      cl.members.forEach(m => memberToCluster.set(m.id, cl));
      const mSet = new Set(cl.members.map(m => m.id));
      const internalEdges = edges.filter(e => mSet.has(e.from) && mSet.has(e.to));
      const maxInternalLabelW = Math.max(
        0,
        ...internalEdges.map(e => measureTextPx(e.label, 11) + 36)
      );

      const colsCount = cl.members.length > 4 ? 2 : 1;
      const innerColGap = Math.max(96, maxInternalLabelW);
      const innerRowGap = Math.max(82, internalEdges.some(e => e.label) ? 98 : 78);

      cl.members.forEach((m, idx) => {
        m.localCol = idx % colsCount;
        m.localRow = Math.floor(idx / colsCount);
      });

      const numRows = Math.ceil(cl.members.length / colsCount);
      const colWidths = Array.from({ length: colsCount }, (_, c) =>
        Math.max(130, ...cl.members.filter(m => m.localCol === c).map(m => m.w))
      );

      const padX = cl.isGroup ? 24 : 0;
      const padTop = cl.isGroup ? 42 : 0;
      const padBottom = cl.isGroup ? 22 : 0;

      const colOffsets = [padX];
      for (let c = 0; c < colsCount - 1; c++) {
        colOffsets.push(colOffsets[c] + colWidths[c] + innerColGap);
      }

      cl.members.forEach(m => {
        m.relX = colOffsets[m.localCol] + (colWidths[m.localCol] - m.w) / 2;
        m.relY = padTop + m.localRow * innerRowGap;
      });

      const contentW = colOffsets[colsCount - 1] + colWidths[colsCount - 1] + padX;
      const headerChipW = cl.isGroup ? Math.max(72, measureTextPx(cl.label, 10.5) + 24) : 0;
      cl.w = Math.max(contentW, headerChipW + 32);
      cl.h = padTop + Math.max(1, numRows - 1) * innerRowGap + 54 + padBottom;
      cl.headerChipW = headerChipW;
    });

    const crossEdges = [];
    edges.forEach(e => {
      const cFrom = memberToCluster.get(e.from);
      const cTo = memberToCluster.get(e.to);
      if (cFrom && cTo && cFrom.id !== cTo.id) {
        crossEdges.push({ from: cFrom.id, to: cTo.id, label: e.label || "" });
      }
    });

    if (crossEdges.length === 0) {
      const colsPerRow = Math.min(3, Math.max(1, clusters.length));
      clusters.forEach((cl, idx) => {
        cl.mCol = idx % colsPerRow;
        cl.mRow = Math.floor(idx / colsPerRow);
      });
    } else {
      const macroRanks = assignTopologicalRanks(clusters, crossEdges, null);
      const byCol = new Map();
      clusters.forEach(cl => {
        const mc = Math.min(3, macroRanks.get(cl.id) || 0);
        cl.mCol = mc;
        const list = byCol.get(mc) || [];
        cl.mRow = list.length;
        list.push(cl);
        byCol.set(mc, list);
      });
    }

    const maxMCol = Math.max(0, ...clusters.map(c => c.mCol));
    const mColWidths = Array.from({ length: maxMCol + 1 }, (_, c) =>
      Math.max(160, ...clusters.filter(cl => cl.mCol === c).map(cl => cl.w))
    );

    const maxCrossLabelW = Math.max(0, ...crossEdges.map(e => measureTextPx(e.label, 11) + 56));
    const macroColGap = Math.max(116, maxCrossLabelW);
    const macroRowGap = 64;
    const leftMargin = 42;
    const topMargin = 42;

    const mColX = [leftMargin];
    for (let c = 0; c < maxMCol; c++) {
      mColX.push(mColX[c] + mColWidths[c] + macroColGap);
    }

    for (let c = 0; c <= maxMCol; c++) {
      const colClusters = clusters.filter(cl => cl.mCol === c).sort((a, b) => a.mRow - b.mRow);
      let curY = topMargin;
      colClusters.forEach(cl => {
        cl.x = mColX[c] + (mColWidths[c] - cl.w) / 2;
        cl.y = curY;
        cl.members.forEach(m => {
          m.x = cl.x + m.relX;
          m.y = cl.y + m.relY;
        });
        curY += cl.h + macroRowGap;
      });
    }

    const parts = [renderDefs()];
    const headerChips = [];

    clusters.forEach(cl => {
      if (!cl.isGroup) return;
      const chipBox = { x: cl.x + 14, y: cl.y - 9, w: cl.headerChipW, h: 18 };
      headerChips.push(chipBox);
      parts.push(
        '<g class="arch-group">' +
        '<rect x="' + cl.x.toFixed(1) + '" y="' + cl.y.toFixed(1) + '" width="' + cl.w.toFixed(1) + '" height="' + cl.h.toFixed(1) + '" rx="10" class="c-region" stroke-width="1.2"/>' +
        '<rect x="' + chipBox.x.toFixed(1) + '" y="' + chipBox.y.toFixed(1) + '" width="' + cl.headerChipW + '" height="18" rx="5" class="c-mask phase-chip"/>' +
        '<text x="' + (chipBox.x + cl.headerChipW / 2).toFixed(1) + '" y="' + (cl.y + 4).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="600" class="t-' + esc(cl.tone) + '">' + esc(cl.label) + "</text>" +
        "</g>"
      );
    });

    const placer = createLabelPlacer(nodes, headerChips);
    parts.push(renderEdgeSet(edges, byId, nodes, placer));

    nodes.forEach((node, idx) => {
      parts.push(renderNodeBox(node, idx));
    });

    const bounds = placer.getBounds();
    const maxClX = Math.max(0, ...clusters.map(cl => cl.x + cl.w));
    const maxClY = Math.max(0, ...clusters.map(cl => cl.y + cl.h));
    const canvasW = Math.max(640, bounds.maxX + 42, maxClX + 42);
    const canvasH = Math.max(220, bounds.maxY + 36, maxClY + 36);

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  // 2, 3, 4, 5: Graph Layout (workflow, architecture, dataflow, lifecycle)
  function compileGraphDiagram(parsed) {
    const type = parsed.type;
    const lanes = new Map();
    const groups = new Map();
    const nodes = [];
    const byId = new Map();
    const edges = [];
    const explicitColMap = new Map();
    let mainPathIds = [];

    function ensureNode(id, label, rawKind, containerId) {
      if (byId.has(id)) return byId.get(id);
      const cleanLabel = label || id;
      const isDecision = type === "workflow" && (cleanLabel.endsWith("?") || cleanLabel.endsWith("？") || String(rawKind || "").toLowerCase() === "decision");
      const lines = wrapNodeLabel(cleanLabel, isDecision ? 20 : 24);
      const maxLinePx = Math.max(...lines.map(l => measureTextPx(l, 12.5)));
      const node = {
        id,
        label: cleanLabel,
        lines,
        rawKind: isDecision ? "decision" : (rawKind || "backend"),
        tone: normalizeTone(isDecision ? "decision" : (rawKind || "backend")),
        isDecision,
        containerId: containerId || ""
      };
      node.w = Math.max(isDecision ? 136 : 122, maxLinePx + (isDecision ? 48 : 38));
      node.h = lines.length > 1 ? (isDecision ? 66 : 58) : (isDecision ? 54 : 46);
      nodes.push(node);
      byId.set(id, node);
      return node;
    }

    for (const row of parsed.rows) {
      const first = row[0] || "";
      if (first.toLowerCase().startsWith("lane ")) {
        const lid = first.slice(5).trim();
        lanes.set(lid, { id: lid, label: row[1] || lid });
        continue;
      }
      if (first.toLowerCase().startsWith("group ")) {
        const gid = first.slice(6).trim();
        groups.set(gid, { id: gid, label: row[1] || gid, tone: normalizeTone(row[2] || "cloud") });
        continue;
      }
      if (type === "lifecycle" && first.toLowerCase() === "main") {
        mainPathIds = (row[1] || "")
          .split(">")
          .map(s => s.trim())
          .filter(Boolean);
        mainPathIds.forEach((id, idx) => {
          if (!explicitColMap.has(id)) explicitColMap.set(id, idx);
        });
        continue;
      }

      const routeMatch = first.match(/^([A-Za-z0-9_.-]+)\s*>\s*([A-Za-z0-9_.-]+)$/);
      if (routeMatch) {
        const fromId = routeMatch[1];
        const toId = routeMatch[2];
        ensureNode(fromId, fromId, "backend", "");
        ensureNode(toId, toId, "backend", "");
        edges.push({
          id: fromId + "-to-" + toId + "-" + (edges.length + 1),
          from: fromId,
          to: toId,
          label: row[1] || "",
          variant: row[2] || "default"
        });
      } else {
        const nid = first;
        const nlabel = row[1] || nid;
        const nkind = row[2] || "backend";
        const fourth = row[3] || "";
        const node = ensureNode(nid, nlabel, nkind, fourth);
        if (type === "dataflow" && fourth !== "" && !Number.isNaN(Number(fourth))) {
          explicitColMap.set(node.id, Math.max(0, Math.min(8, Number(fourth))));
        }
      }
    }

    if (groups.size > 0 && lanes.size === 0) {
      return layoutGroupedArchitecture(groups, nodes, byId, edges);
    }

    const ranks = assignTopologicalRanks(nodes, edges, explicitColMap.size > 0 ? explicitColMap : null);
    const maxColsPerBand = 5;

    nodes.forEach(n => {
      const r = ranks.get(n.id) || 0;
      if (r >= maxColsPerBand && type !== "dataflow") {
        n.col = r % maxColsPerBand;
        n.bandRow = Math.floor(r / maxColsPerBand);
      } else {
        n.col = r;
        n.bandRow = 0;
      }
    });

    const parts = [renderDefs()];
    const extraObstacles = [];
    let canvasW = 680;
    let canvasH = 220;

    if (lanes.size > 0) {
      const laneList = Array.from(lanes.values());
      const defaultLaneId = laneList[0].id;
      nodes.forEach(n => {
        if (!n.containerId || !lanes.has(n.containerId)) {
          n.containerId = defaultLaneId;
        }
      });

      const maxCol = Math.max(0, ...nodes.map(n => n.col));
      const colWidths = Array.from({ length: maxCol + 1 }, (_, c) =>
        Math.max(132, ...nodes.filter(n => n.col === c).map(n => n.w))
      );

      const colGaps = Array.from({ length: Math.max(1, maxCol) }, (_, c) => {
        const labelLengths = edges
          .filter(e => {
            const fn = byId.get(e.from);
            const tn = byId.get(e.to);
            return fn && tn && Math.min(fn.col, tn.col) === c && Math.abs(fn.col - tn.col) === 1;
          })
          .map(e => measureTextPx(e.label, 11) + 40);
        return Math.max(92, ...labelLengths);
      });

      const leftMargin = 54;
      const colX = [leftMargin];
      for (let c = 0; c < maxCol; c++) {
        colX.push(colX[c] + colWidths[c] + colGaps[c]);
      }
      canvasW = Math.max(660, colX[maxCol] + colWidths[maxCol] + leftMargin);

      let curLaneY = 32;
      laneList.forEach(lane => {
        const laneNodes = nodes.filter(n => n.containerId === lane.id);
        const byCol = new Map();
        laneNodes.forEach(n => {
          const list = byCol.get(n.col) || [];
          list.push(n);
          byCol.set(n.col, list);
        });
        const maxStack = Math.max(1, ...Array.from(byCol.values()).map(l => l.length));
        const laneH = Math.max(118, 48 + maxStack * 84);

        extraObstacles.push({
          x: 38,
          y: curLaneY + 6,
          w: measureTextPx(lane.label, 11) + 16,
          h: 20
        });

        parts.push(
          '<g class="wf-lane">' +
          '<rect x="28" y="' + curLaneY + '" width="' + (canvasW - 56) + '" height="' + laneH + '" rx="10" class="c-lane" stroke-width="1"/>' +
          '<text x="44" y="' + (curLaneY + 22) + '" font-size="11" font-weight="600" class="t-muted">' + esc(lane.label) + "</text>" +
          "</g>"
        );

        byCol.forEach((stack, colIdx) => {
          stack.forEach((n, sIdx) => {
            n.x = colX[colIdx] + (colWidths[colIdx] - n.w) / 2;
            n.y = curLaneY + 38 + sIdx * 82;
          });
        });

        curLaneY += laneH + 22;
      });
      canvasH = Math.max(240, curLaneY + 20);
    } else {
      const cellMap = new Map();
      const uniqueMainIds = Array.from(new Set(mainPathIds));
      nodes.forEach(n => {
        let rowIdx = n.bandRow || 0;
        if (type === "lifecycle" && uniqueMainIds.length > 0 && !uniqueMainIds.includes(n.id)) {
          rowIdx = 1;
        }
        const key = n.col + ":" + rowIdx;
        while (cellMap.has(key + ":" + (n.subRow || 0))) {
          n.subRow = (n.subRow || 0) + 1;
        }
        n.gridRow = rowIdx * 2 + (n.subRow || 0);
        cellMap.set(key + ":" + (n.subRow || 0), n);
      });

      const usedRows = Array.from(new Set(nodes.map(n => n.gridRow))).sort((a, b) => a - b);
      nodes.forEach(n => {
        n.row = Math.max(0, usedRows.indexOf(n.gridRow));
      });

      const maxCol = Math.max(0, ...nodes.map(n => n.col));
      const maxRow = Math.max(0, ...nodes.map(n => n.row));
      const colWidths = Array.from({ length: maxCol + 1 }, (_, c) =>
        Math.max(132, ...nodes.filter(n => n.col === c).map(n => n.w))
      );

      const colGaps = Array.from({ length: Math.max(1, maxCol) }, (_, c) => {
        const labelLengths = edges
          .filter(e => {
            const fn = byId.get(e.from);
            const tn = byId.get(e.to);
            return fn && tn && Math.min(fn.col, tn.col) === c && Math.abs(fn.col - tn.col) === 1;
          })
          .map(e => measureTextPx(e.label, 11) + 46);
        return Math.max(96, ...labelLengths);
      });

      const leftMargin = 48;
      const topMargin = 62;
      const rowGap = 112;
      const colX = [leftMargin];
      for (let c = 0; c < maxCol; c++) {
        colX.push(colX[c] + colWidths[c] + colGaps[c]);
      }

      nodes.forEach(n => {
        n.x = colX[n.col] + (colWidths[n.col] - n.w) / 2;
        n.y = topMargin + n.row * rowGap;
      });

      canvasW = Math.max(620, colX[maxCol] + colWidths[maxCol] + leftMargin);
      canvasH = Math.max(220, topMargin + maxRow * rowGap + 104);
    }

    const placer = createLabelPlacer(nodes, extraObstacles);
    parts.push(renderEdgeSet(edges, byId, nodes, placer));

    nodes.forEach((node, idx) => {
      parts.push(renderNodeBox(node, idx));
    });

    const bounds = placer.getBounds();
    canvasW = Math.max(canvasW, bounds.maxX + 42);
    canvasH = Math.max(canvasH, bounds.maxY + 36);

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  // 6. Tree Renderer
  function compileTree(parsed) {
    const nodes = [];
    const byId = new Map();
    parsed.rows.forEach((row, idx) => {
      const id = row[0] || ("node_" + idx);
      const label = row[1] || id;
      const parent = row[2] && row[2] !== "-" ? row[2] : null;
      const rawKind = row[3] || (parent ? "backend" : "database");
      const lines = wrapNodeLabel(label, 28);
      const maxLinePx = Math.max(...lines.map(l => measureTextPx(l, 12.5)));
      const node = {
        id,
        label,
        lines,
        parent,
        rawKind,
        tone: normalizeTone(rawKind),
        children: [],
        w: Math.max(124, maxLinePx + 38),
        h: lines.length > 1 ? 56 : 44
      };
      nodes.push(node);
      byId.set(id, node);
    });

    const roots = [];
    nodes.forEach(n => {
      if (n.parent && byId.has(n.parent)) {
        byId.get(n.parent).children.push(n);
      } else {
        roots.push(n);
      }
    });

    let leafCursor = 0;
    const depthMaxW = new Map();
    function layoutSubtree(node, depth) {
      node.depth = depth;
      depthMaxW.set(depth, Math.max(depthMaxW.get(depth) || 130, node.w));
      if (node.children.length === 0) {
        node.slot = leafCursor;
        leafCursor += 1;
      } else {
        node.children.forEach(ch => layoutSubtree(ch, depth + 1));
        const firstSlot = node.children[0].slot;
        const lastSlot = node.children[node.children.length - 1].slot;
        node.slot = (firstSlot + lastSlot) / 2;
      }
    }

    roots.forEach(r => layoutSubtree(r, 0));

    const maxDepth = Math.max(0, ...nodes.map(n => n.depth || 0));
    const colX = [48];
    for (let d = 0; d < maxDepth; d++) {
      colX.push(colX[d] + (depthMaxW.get(d) || 140) + 74);
    }

    const rowSpacing = 70;
    const topMargin = 34;
    nodes.forEach(n => {
      const colW = depthMaxW.get(n.depth || 0) || n.w;
      n.x = colX[n.depth || 0] + (colW - n.w) / 2;
      n.y = topMargin + (n.slot || 0) * rowSpacing;
    });

    const canvasW = Math.max(600, colX[maxDepth] + (depthMaxW.get(maxDepth) || 150) + 48);
    const canvasH = Math.max(200, topMargin + Math.max(1, leafCursor) * rowSpacing + 32);

    const parts = [renderDefs()];
    const treeEdges = [];
    nodes.forEach(n => {
      n.children.forEach(ch => {
        treeEdges.push({
          id: n.id + "-to-" + ch.id,
          from: n.id,
          to: ch.id,
          label: "",
          variant: "default"
        });
      });
    });

    const placer = createLabelPlacer(nodes, []);
    parts.push(renderEdgeSet(treeEdges, byId, nodes, placer));

    nodes.forEach((n, idx) => {
      parts.push(renderNodeBox(n, idx));
    });

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  // 7. ERD Renderer
  function compileErd(parsed) {
    const entities = [];
    const byId = new Map();
    const relationships = [];

    function ensureEntity(id, label, domainTag) {
      if (byId.has(id)) return byId.get(id);
      const ent = { id, label: label || id, domainTag: domainTag || "", attributes: [] };
      entities.push(ent);
      byId.set(id, ent);
      return ent;
    }

    for (const row of parsed.rows) {
      const first = row[0] || "";
      if (first.toLowerCase().startsWith("entity ")) {
        const eid = first.slice(7).trim();
        ensureEntity(eid, row[1] || eid, row[2] || "");
        continue;
      }
      const routeMatch = first.match(/^([A-Za-z0-9_.-]+)\s*>\s*([A-Za-z0-9_.-]+)$/);
      if (routeMatch) {
        const fromId = routeMatch[1];
        const toId = routeMatch[2];
        ensureEntity(fromId, fromId, "");
        ensureEntity(toId, toId, "");
        relationships.push({
          id: fromId + "-to-" + toId + "-" + (relationships.length + 1),
          from: fromId,
          to: toId,
          cardinality: row[1] || "many:one",
          label: row[2] || ""
        });
        continue;
      }
      const fieldMatch = first.match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_]+)$/);
      if (fieldMatch) {
        const ent = ensureEntity(fieldMatch[1], fieldMatch[1], "");
        ent.attributes.push({
          name: fieldMatch[2],
          sqlType: row[1] || "text",
          key: (row[2] || "").toUpperCase(),
          ref: row[3] || ""
        });
      }
    }

    const colsPerRow = Math.min(3, Math.max(1, entities.length));
    entities.forEach((ent, idx) => {
      const titleW = measureTextPx(ent.label, 13) + (ent.domainTag ? measureTextPx(ent.domainTag, 10) + 28 : 0) + 34;
      const attrWidths = ent.attributes.map(a =>
        measureTextPx(a.name, 11.5) + measureTextPx(a.sqlType, 11) + (a.key ? 38 : 0) + 48
      );
      ent.w = Math.max(210, titleW, ...attrWidths);
      ent.h = 38 + Math.max(1, ent.attributes.length) * 24 + 8;
      ent.col = idx % colsPerRow;
      ent.row = Math.floor(idx / colsPerRow);
    });

    const erdEdges = relationships.map(rel => ({
      id: rel.id,
      from: rel.from,
      to: rel.to,
      label: rel.cardinality ? rel.cardinality + (rel.label ? " · " + rel.label : "") : rel.label,
      variant: "emphasis"
    }));

    const maxEdgeLabelW = Math.max(0, ...erdEdges.map(e => measureTextPx(e.label, 11) + 48));
    const maxCol = Math.max(0, ...entities.map(e => e.col));
    const maxRow = Math.max(0, ...entities.map(e => e.row));
    const colWidths = Array.from({ length: maxCol + 1 }, (_, c) =>
      Math.max(210, ...entities.filter(e => e.col === c).map(e => e.w))
    );
    const rowHeights = Array.from({ length: maxRow + 1 }, (_, r) =>
      Math.max(90, ...entities.filter(e => e.row === r).map(e => e.h))
    );

    const colGap = Math.max(120, maxEdgeLabelW);
    const rowGap = 92;
    const leftMargin = 48;
    const topMargin = 44;

    const colX = [leftMargin];
    for (let c = 0; c < maxCol; c++) colX.push(colX[c] + colWidths[c] + colGap);
    const rowY = [topMargin];
    for (let r = 0; r < maxRow; r++) rowY.push(rowY[r] + rowHeights[r] + rowGap);

    entities.forEach(ent => {
      ent.x = colX[ent.col];
      ent.y = rowY[ent.row];
    });

    const parts = [renderDefs()];
    const placer = createLabelPlacer(entities, []);
    parts.push(renderEdgeSet(erdEdges, byId, entities, placer));

    entities.forEach((ent, idx) => {
      let rowsSvg = "";
      ent.attributes.forEach((attr, aIdx) => {
        const ay = ent.y + 38 + aIdx * 24;
        const badge = attr.key
          ? '<rect x="' + (ent.x + 10) + '" y="' + (ay + 4) + '" width="26" height="15" rx="3" class="c-security"/>' +
            '<text x="' + (ent.x + 23) + '" y="' + (ay + 14.5) + '" text-anchor="middle" font-size="9.5" font-weight="700" class="t-security">' + esc(attr.key) + "</text>"
          : "";
        const nameX = ent.x + (attr.key ? 42 : 14);
        rowsSvg +=
          (aIdx > 0 ? '<line x1="' + (ent.x + 1) + '" y1="' + ay + '" x2="' + (ent.x + ent.w - 1) + '" y2="' + ay + '" class="c-lane-rule" stroke-width="0.75"/>' : "") +
          badge +
          '<text x="' + nameX + '" y="' + (ay + 15.5) + '" font-size="11.5" font-weight="500" class="t-primary">' + esc(attr.name) + "</text>" +
          '<text x="' + (ent.x + ent.w - 12) + '" y="' + (ay + 15.5) + '" text-anchor="end" font-size="11" class="t-muted">' + esc(attr.sqlType) + "</text>";
      });

      parts.push(
        '<g data-node-id="' + esc(ent.id) + '" data-node-label="' + esc(ent.label) + '" data-node-kind="database" style="--step:' + idx + '">' +
        '<rect x="' + ent.x + '" y="' + ent.y + '" width="' + ent.w + '" height="' + ent.h + '" rx="9" class="c-mask"/>' +
        '<rect x="' + ent.x + '" y="' + ent.y + '" width="' + ent.w + '" height="' + ent.h + '" rx="9" class="c-database node-shape"/>' +
        '<line x1="' + ent.x + '" y1="' + (ent.y + 36) + '" x2="' + (ent.x + ent.w) + '" y2="' + (ent.y + 36) + '" class="c-lane-rule" stroke-width="1"/>' +
        renderSigil("database", ent.x + 8, ent.y + 9) +
        '<text x="' + (ent.x + 28) + '" y="' + (ent.y + 23) + '" font-size="12.5" font-weight="700" class="t-primary">' + esc(ent.label) + "</text>" +
        (ent.domainTag ? '<text x="' + (ent.x + ent.w - 12) + '" y="' + (ent.y + 22) + '" text-anchor="end" font-size="10" font-weight="600" class="t-database">' + esc(ent.domainTag) + "</text>" : "") +
        rowsSvg +
        "</g>"
      );
    });

    const bounds = placer.getBounds();
    const canvasW = Math.max(620, colX[maxCol] + colWidths[maxCol] + leftMargin, bounds.maxX + 42);
    const canvasH = Math.max(220, rowY[maxRow] + rowHeights[maxRow] + topMargin, bounds.maxY + 36);

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  // 8. Timeline Renderer
  function compileTimeline(parsed) {
    const lanes = new Map();
    const events = [];

    for (const row of parsed.rows) {
      const first = row[0] || "";
      if (first.toLowerCase().startsWith("lane ")) {
        const lid = first.slice(5).trim();
        lanes.set(lid, { id: lid, label: row[1] || lid });
        continue;
      }
      const id = first || ("ev_" + (events.length + 1));
      const at = row[1] || "";
      const title = row[2] || id;
      const lane = row[3] || "default";
      const kind = row[4] || "default";
      if (!lanes.has(lane)) {
        lanes.set(lane, { id: lane, label: lane === "default" ? "时间轴" : lane });
      }
      events.push({
        id,
        at,
        title,
        lane,
        tone: normalizeTone(kind),
        w: Math.max(152, Math.max(measureTextPx(title, 12), measureTextPx(at, 10.5)) + 34),
        h: 54
      });
    }

    const laneList = Array.from(lanes.values());
    const colGap = 34;
    const leftHeaderW = 118;
    let curX = leftHeaderW + 24;
    events.forEach(ev => {
      ev.x = curX;
      curX += ev.w + colGap;
    });

    const canvasW = Math.max(660, curX + 24);
    const laneH = 92;
    const topMargin = 28;
    const canvasH = Math.max(190, topMargin + laneList.length * laneH + 24);
    const parts = [renderDefs()];

    laneList.forEach((lane, lIdx) => {
      const ly = topMargin + lIdx * laneH;
      const midY = ly + laneH / 2;
      parts.push(
        '<g class="tl-lane">' +
        '<rect x="20" y="' + ly + '" width="' + (canvasW - 40) + '" height="' + (laneH - 10) + '" rx="9" class="c-lane" stroke-width="1"/>' +
        '<text x="34" y="' + (midY + 4) + '" font-size="11.5" font-weight="600" class="t-muted">' + esc(lane.label) + "</text>" +
        '<line x1="' + leftHeaderW + '" y1="' + midY + '" x2="' + (canvasW - 36) + '" y2="' + midY + '" class="c-lane-rule" stroke-width="1.5"/>' +
        "</g>"
      );
    });

    events.forEach((ev, idx) => {
      const lIdx = Math.max(0, laneList.findIndex(l => l.id === ev.lane));
      const midY = topMargin + lIdx * laneH + laneH / 2;
      ev.y = midY - ev.h / 2;
      parts.push(
        '<g data-node-id="' + esc(ev.id) + '" data-node-label="' + esc(ev.title) + '" data-node-kind="' + esc(ev.tone) + '" style="--step:' + idx + '">' +
        '<rect x="' + ev.x + '" y="' + ev.y + '" width="' + ev.w + '" height="' + ev.h + '" rx="8" class="c-mask"/>' +
        '<rect x="' + ev.x + '" y="' + ev.y + '" width="' + ev.w + '" height="' + ev.h + '" rx="8" class="c-' + esc(ev.tone) + ' node-shape"/>' +
        '<text x="' + (ev.x + 12) + '" y="' + (ev.y + 19) + '" font-size="10.5" font-weight="700" class="t-' + esc(ev.tone) + '">' + esc(ev.at) + "</text>" +
        '<text x="' + (ev.x + 12) + '" y="' + (ev.y + 39) + '" font-size="12" font-weight="600" class="t-primary">' + esc(ev.title) + "</text>" +
        "</g>"
      );
    });

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  // 9. Waterfall Renderer
  function compileWaterfall(parsed) {
    const spans = parsed.rows.map((row, idx) => {
      const id = row[0] || ("span_" + idx);
      const label = row[1] || id;
      const start = Math.max(0, Number(row[2]) || 0);
      const duration = Math.max(1, Number(row[3]) || 1);
      const parent = row[4] && row[4] !== "-" ? row[4] : null;
      const rawKind = row[5] || "backend";
      return {
        id,
        label,
        start,
        duration,
        end: start + duration,
        parent,
        tone: normalizeTone(rawKind)
      };
    });

    const maxEnd = Math.max(10, ...spans.map(s => s.end));
    const maxLabelW = Math.max(170, ...spans.map(s => measureTextPx(s.label, 12) + (s.parent ? 28 : 16)));
    const trackX = maxLabelW + 38;
    const trackW = 480;
    const canvasW = trackX + trackW + 64;
    const rowH = 38;
    const topMargin = 46;
    const canvasH = Math.max(180, topMargin + spans.length * rowH + 28);

    const parts = [renderDefs()];

    const tickCount = 5;
    for (let t = 0; t <= tickCount; t++) {
      const ratio = t / tickCount;
      const tx = trackX + ratio * trackW;
      const val = Math.round(ratio * maxEnd);
      parts.push(
        '<line x1="' + tx.toFixed(1) + '" y1="26" x2="' + tx.toFixed(1) + '" y2="' + (canvasH - 18) + '" class="c-lane-rule" stroke-width="1" stroke-dasharray="3,4"/>' +
        '<text x="' + tx.toFixed(1) + '" y="20" text-anchor="middle" font-size="10.5" class="t-muted">' + val + " ms</text>"
      );
    }

    spans.forEach((sp, idx) => {
      const ry = topMargin + idx * rowH;
      const bx = trackX + (sp.start / maxEnd) * trackW;
      const bw = Math.max(10, (sp.duration / maxEnd) * trackW);
      const indent = sp.parent ? 14 : 0;
      parts.push(
        '<g data-node-id="' + esc(sp.id) + '" data-node-label="' + esc(sp.label) + '" data-node-kind="' + esc(sp.tone) + '" style="--step:' + idx + '">' +
        '<rect x="16" y="' + (ry - 4) + '" width="' + (canvasW - 32) + '" height="' + (rowH - 4) + '" rx="6" fill="transparent" class="wf-row-hit"/>' +
        '<text x="' + (24 + indent) + '" y="' + (ry + 15) + '" font-size="12" font-weight="' + (sp.parent ? "500" : "700") + '" class="t-primary">' + esc(sp.label) + "</text>" +
        '<rect x="' + bx.toFixed(1) + '" y="' + (ry + 1) + '" width="' + bw.toFixed(1) + '" height="20" rx="5" class="c-' + esc(sp.tone) + ' node-shape"/>' +
        '<text x="' + (bx + bw + 8).toFixed(1) + '" y="' + (ry + 15) + '" font-size="11" font-weight="600" class="t-' + esc(sp.tone) + '">' + sp.duration + " ms</text>" +
        "</g>"
      );
    });

    return { width: canvasW, height: canvasH, innerSvg: parts.join("\n") };
  }

  function renderArchifySvg(rawText) {
    const parsed = parseArchifyBlock(rawText);
    let compiled;
    if (parsed.type === "sequence") {
      compiled = compileSequence(parsed);
    } else if (parsed.type === "tree") {
      compiled = compileTree(parsed);
    } else if (parsed.type === "erd") {
      compiled = compileErd(parsed);
    } else if (parsed.type === "timeline") {
      compiled = compileTimeline(parsed);
    } else if (parsed.type === "waterfall") {
      compiled = compileWaterfall(parsed);
    } else {
      compiled = compileGraphDiagram(parsed);
    }

    const svg =
      '<svg viewBox="0 0 ' + Math.ceil(compiled.width) + " " + Math.ceil(compiled.height) + '" ' +
      'role="img" aria-label="' + esc(parsed.title) + '" ' +
      'class="archify-svg" data-archify-id="' + esc(parsed.id) + '" data-archify-type="' + esc(parsed.type) + '" data-animation="trace">' +
      "<title>" + esc(parsed.title) + "</title>" +
      compiled.innerSvg +
      "</svg>";

    return {
      id: parsed.id,
      type: parsed.type,
      title: parsed.title,
      width: Math.ceil(compiled.width),
      height: Math.ceil(compiled.height),
      svg
    };
  }

  global.StudyDiagrams = {
    ARCHIFY_TYPES,
    textUnits,
    measureTextPx,
    parseArchifyBlock,
    parseStudyStepsBlock,
    renderArchifySvg
  };
})(typeof window !== "undefined" ? window : globalThis);
