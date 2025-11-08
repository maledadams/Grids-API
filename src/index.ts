import express, { type Request, type Response } from "express"
import cors from "cors"
import { body, validationResult } from "express-validator"

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static("public"));

type Point = {
  xPosition: number
  yPosition: number
}

type Grid = {
  origin: Point
  height: number
  width: number
  color: string
  isActive: boolean
}

const Grids: Grid[] = [
  {
    origin: { xPosition: 0, yPosition: 0 },
    color: "red",
    height: 5,
    width: 5,
    isActive: true
  }
]

app.get("/grids", (_req: Request, res: Response) => {
  res.status(200).send(Grids)
})

app.post(
  "/grids",
  [
    body("origin").exists().withMessage("origin is required").isObject(),
    body("origin.xPosition").exists().isInt({ min: 0, max: 99 }).toInt(),
    body("origin.yPosition").exists().isInt({ min: 0, max: 99 }).toInt(),
    body("width").exists().isInt({ min: 1, max: 99 }).toInt(),
    body("height").exists().isInt({ min: 1, max: 99 }).toInt(),
    body("color").exists().isString(),
    body("isActive").optional().isBoolean().toBoolean()
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).send({ errors: errors.array() })
      return
    }

    const { origin, height, width, isActive, color } = req.body

    Grids.push({
      origin,
      height,
      width,
      isActive: isActive ?? true,
      color
    })

    res.status(201).send()
  }
)

app.patch("/grids/:index/toggle", (req: Request, res: Response) => {
  const idx = Number(req.params.index)
  if (Number.isNaN(idx) || idx < 0 || idx >= Grids.length) {
    res.status(400).send({ error: "invalid index" })
    return
  }
  Grids[idx].isActive = !Grids[idx].isActive
  res.status(200).send({ index: idx, isActive: Grids[idx].isActive })
})

app.delete("/grids/:index", (req: Request, res: Response) => {
  const idx = Number(req.params.index)
  if (Number.isNaN(idx) || idx < 0 || idx >= Grids.length) {
    res.status(404).send({ error: "grid not found" })
    return
  }
  Grids.splice(idx, 1)
  res.status(200).send({ deletedIndex: idx })
})

app.get("/grids/display", (_req: Request, res: Response) => {
  let maxX = 0
  let maxY = 0
  for (const g of Grids) {
    maxX = Math.max(maxX, g.origin.xPosition + g.width)
    maxY = Math.max(maxY, g.origin.yPosition + g.height)
  }

  const active = Grids.filter(g => g.isActive)

  let cells = ""
  for (let y = maxY - 1; y >= 0; y -= 1) {
    for (let x = 0; x < maxX; x += 1) {
      const color =
        CalculateIntersection({ xPosition: x, yPosition: y }, active) ?? "white"
      cells += `<div style="background-color:${color}; height:60px; width:60px; border:1px solid black; display:flex; align-items:center; justify-content:center;">[${y},${x}]</div>`
    }
  }

  let rows = ""
  Grids.forEach((grid, i) => {
    rows += `
      <tr>
        <td>${i}</td>
        <td>(${grid.origin.xPosition}, ${grid.origin.yPosition})</td>
        <td>${grid.width}</td>
        <td>${grid.height}</td>
        <td><span style="display:inline-block;width:16px;height:16px;background:${grid.color};border:1px solid #000;"></span> ${grid.color}</td>
        <td>${grid.isActive ? "Active" : "Inactive"}</td>
        <td style="display:flex; gap:6px;">
          <button data-index="${i}" class="toggle-btn">Toggle</button>
          <button data-index="${i}" class="delete-btn">Delete</button>
        </td>
      </tr>
    `
  })

  const htmlTable = `
    <div class="container">
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>(x, y)</th>
            <th>Width</th>
            <th>Height</th>
            <th>Color</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `

  const inputForm = `
    <div>
      <form id="gridForm" style="display:flex; gap:8px; align-items:flex-end; flex-direction:column">
        <div style="display:flex; gap:8px;">
          <label for="xPosition">X Position:</label>
          <input type="number" id="xPosition" name="xPosition" value="0" min="0" max="99" step="1" inputmode="numeric" pattern="\\d*">
        </div>
        <div style="display:flex; gap:8px;">
          <label for="yPosition">Y Position:</label>
          <input type="number" id="yPosition" name="yPosition" value="0" min="0" max="99" step="1" inputmode="numeric" pattern="\\d*">
        </div>
        <div style="display:flex; gap:8px;">
          <label for="width">Width:</label>
          <input type="number" id="width" name="width" value="1" min="1" max="99" step="1" inputmode="numeric" pattern="\\d*">
        </div>
        <div style="display:flex; gap:8px;">
          <label for="height">Height:</label>
          <input type="number" id="height" name="height" value="1" min="1" max="99" step="1" inputmode="numeric" pattern="\\d*">
        </div>
        <div style="display:flex; gap:8px;">
          <label for="color">Color:</label>
          <input type="color" id="color" name="color" value="#ff0000">
        </div>
        <button type="submit" style="width:100%; border:none; padding:6px; border-radius:4px; cursor:pointer; ">Add Grid</button>
      </form>
    </div>
  `

  const drawing = `
      <style>
  </style>
    <div id="main" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0 auto; padding:20px; gap:10px;">
     <img src="/luffytini.jpeg" alt="logo" style="position:fixed; top:8px; left:8px; height:60px; z-index:1000;">
     <img src="/GRIDS-API.png" alt="logo" style="position:static; top:8px; left:1300px; height:230px; z-index:1000;">
      <div>${inputForm}</div>

      <div style="display:flex; gap:8px; margin-bottom:8px;">
        <button id="zoomOutBtn">−</button>
        <button id="zoomInBtn">+</button>
        <button id="resetViewBtn">Reset</button>
      </div>

      <div id="viewport" style="
        width: 90vw;
        height: 70vh;
        border: 2px solid #000;
        overflow: hidden;
        position: relative;
        cursor: grab;
        background: #fafafa;
        margin-bottom: 16px;
        
      ">
        <div id="stage" style="transform-origin: 0 0; position: relative;">
          <div id="board" style="display:grid; grid-template-columns: repeat(${maxX}, 60px); gap:0;">
            ${cells}
          </div>
        </div>
      </div>

      <div>${htmlTable}</div>
    </div>

    <script>
      const form = document.getElementById('gridForm')
      const xInput = document.getElementById('xPosition')
      const yInput = document.getElementById('yPosition')
      const wInput = document.getElementById('width')
      const hInput = document.getElementById('height')
      const colorInput = document.getElementById('color')

      form.addEventListener('submit', function (e) {
        e.preventDefault()

        const x = parseInt(xInput.value, 10)
        const y = parseInt(yInput.value, 10)
        const w = parseInt(wInput.value, 10)
        const h = parseInt(hInput.value, 10)
        const color = colorInput.value

        if (
          Number.isNaN(x) || Number.isNaN(y) ||
          Number.isNaN(w) || Number.isNaN(h)
        ) {
          alert('Please enter numbers in all fields')
          return
        }

        if (x < 0 || x > 99 || y < 0 || y > 99 || w < 1 || w > 99 || h < 1 || h > 99) {
          alert('x,y must be 0..99 and width,height 1..99')
          return
        }

        const formData = {
          origin: { xPosition: x, yPosition: y },
          width: w,
          height: h,
          color: color,
          isActive: true
        }

        fetch('/grids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
          .then(function () { location.reload() })
          .catch(function (err) {
            console.error('Error:', err)
            alert('Error adding grid')
          })
      })

      document.querySelectorAll('.toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const idx = btn.getAttribute('data-index')
          fetch('/grids/' + idx + '/toggle', { method: 'PATCH' })
            .then(function () { location.reload() })
            .catch(function (err) { console.error('Error:', err); alert('Error toggling grid') })
        })
      })

      document.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const idx = btn.getAttribute('data-index')
          if (!confirm('Delete grid ' + idx + '?')) return
          fetch('/grids/' + idx, { method: 'DELETE' })
            .then(function () { location.reload() })
            .catch(function (err) { console.error('Error:', err); alert('Error deleting grid') })
        })
      })

      const viewport = document.getElementById('viewport')
      const stage = document.getElementById('stage')
      const zoomInBtn = document.getElementById('zoomInBtn')
      const zoomOutBtn = document.getElementById('zoomOutBtn')
      const resetViewBtn = document.getElementById('resetViewBtn')

      let scale = 1
      const minScale = 0.2
      const maxScale = 6
      let originX = 0
      let originY = 0
      let panning = false
      let startX = 0
      let startY = 0

      function applyTransform() {
        stage.style.transform = 'translate(' + originX + 'px,' + originY + 'px) scale(' + scale + ')'
      }

      function zoomBy(factor) {
        const next = Math.max(minScale, Math.min(maxScale, scale * factor))
        scale = next
        applyTransform()
      }

      zoomInBtn.addEventListener('click', function() { zoomBy(1.2) })
      zoomOutBtn.addEventListener('click', function() { zoomBy(1 / 1.2) })
      resetViewBtn.addEventListener('click', function() {
        scale = 1
        originX = 0
        originY = 0
        applyTransform()
      })

      viewport.addEventListener('wheel', function(e) {
        e.preventDefault()
        const factor = e.deltaY > 0 ? 1 / 1.2 : 1.2
        zoomBy(factor)
      }, { passive: false })

      viewport.addEventListener('mousedown', function(e) {
        panning = true
        startX = e.clientX - originX
        startY = e.clientY - originY
        viewport.style.cursor = 'grabbing'
      })

      window.addEventListener('mousemove', function(e) {
        if (!panning) return
        originX = e.clientX - startX
        originY = e.clientY - startY
        applyTransform()
      })

      window.addEventListener('mouseup', function() {
        panning = false
        viewport.style.cursor = 'grab'
      })

      let lastTouch = null
      viewport.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
          const t = e.touches[0]
          lastTouch = { x: t.clientX, y: t.clientY }
        }
      }, { passive: true })

      viewport.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1 && lastTouch) {
          const t = e.touches[0]
          originX += t.clientX - lastTouch.x
          originY += t.clientY - lastTouch.y
          lastTouch = { x: t.clientX, y: t.clientY }
          applyTransform()
        }
      }, { passive: true })

      viewport.addEventListener('touchend', function() {
        lastTouch = null
      })

      applyTransform()
    </script>
  `
  res.status(200).send(drawing)
})

function CalculateIntersection(point: Point, activeGrids: Grid[]) {
  for (const grid of activeGrids) {
    const withinX =
      point.xPosition >= grid.origin.xPosition &&
      point.xPosition < grid.origin.xPosition + grid.width
    const withinY =
      point.yPosition >= grid.origin.yPosition &&
      point.yPosition < grid.origin.yPosition + grid.height
    if (withinX && withinY) return grid.color
  }
}

app.get("/export", (_req: Request, res: Response) => {
  const exportation = JSON.stringify({ exportedIn: new Date(), grids: Grids }, null, 2)
  res.setHeader("Content-Type", "application/json")
  res.setHeader("Content-Disposition", "attachment; filename=grids-export.json")
  res.status(200).send(exportation)
})

app.get("/import", (_req: Request, res: Response) => {
  const page = `
<!doctype html>
<meta charset="utf-8">
<title>Import Grids</title>
<input type="file" id="file" accept="application/json,.json">
<button id="importBtn" >Import</button>
<a href="/grids/display">Back</a>
<script>
  document.getElementById('importBtn').onclick = () => {
    const f = document.getElementById('file').files[0];
    if (!f) { alert('Choose a JSON file'); return; }
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        fetch('/import', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(data)
        }).then(res => {
          if (res.ok) location.href = '/grids/display';
          else res.json().then(j => alert(j.error || 'Import failed'));
        }).catch(() => alert('Import failed'));
      } catch { alert('Invalid JSON'); }
    };
    r.readAsText(f);
  };
</script>`;
  res.status(200).send(page);
});

app.post("/import", (req: Request, res: Response) => {
  const incoming = req.body as { exportedIn?: string; grids?: any }
  const list = Array.isArray(incoming?.grids) ? incoming.grids : null
  if (!list) {
    res.status(400).send({ error: "invalid" })
    return
  }

  const cleaned: Grid[] = []
  for (const g of list) {
    const ok =
      g &&
      typeof g.color === "string" &&
      typeof g.isActive === "boolean" &&
      g.origin &&
      Number.isFinite(g.origin.xPosition) &&
      Number.isFinite(g.origin.yPosition) &&
      Number.isFinite(g.width) &&
      Number.isFinite(g.height)

    if (!ok) {
      res.status(400).send({ error: "grid has invalid shape" })
      return
    }

    cleaned.push({
      origin: {
        xPosition: Math.max(0, Math.min(99, Number(g.origin.xPosition))),
        yPosition: Math.max(0, Math.min(99, Number(g.origin.yPosition)))
      },
      width: Math.max(1, Math.min(99, Number(g.width))),
      height: Math.max(1, Math.min(99, Number(g.height))),
      color: String(g.color),
      isActive: Boolean(g.isActive)
    })
  }

  Grids.length = 0
  Grids.push(...cleaned)
  res.status(200).send({ imported: Grids.length })
})

app.listen(8083, () => {
  console.log("Running on port 8083")
  console.log("http://localhost:8083")
})
