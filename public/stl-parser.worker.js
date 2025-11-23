// ----------------------------
// STL PARSER WORKER (FIXED)
// ----------------------------

self.onmessage = function (e) {
  const { arrayBuffer } = e.data;

  try {
    self.postMessage({ type: "progress", progress: 5 });

    const view = new Uint8Array(arrayBuffer);
    const isASCII = fastCheckASCII(view);

    self.postMessage({ type: "progress", progress: 15 });

    const geometry = isASCII
      ? parseAsciiSTL(arrayBuffer)
      : parseBinarySTL(arrayBuffer);

    self.postMessage({ type: "progress", progress: 95 });

    // Return typed arrays (transferable)
    self.postMessage(
      {
        type: "complete",
        success: true,
        vertices: geometry.vertices,
        normals: geometry.normals,
        triangleCount: geometry.vertices.length / 9,
        format: isASCII ? "ASCII" : "Binary",
      },
      [geometry.vertices.buffer, geometry.normals.buffer]
    );
  } catch (err) {
    self.postMessage({
      type: "error",
      success: false,
      error: err?.message || "Unknown error",
    });
  }
};

// --------------------------------------------------
// FAST ASCII DETECTION (no TextDecoder crash)
// --------------------------------------------------
function fastCheckASCII(uint8) {
  // If file is smaller than 200 bytes -> ASCII
  if (uint8.length < 200) return true;

  // Check start of file
  const hdr = String.fromCharCode.apply(null, uint8.slice(0, 80)).toLowerCase();

  if (!hdr.startsWith("solid")) return false;

  // If "facet" exists within first KB → ASCII
  const scan = String.fromCharCode.apply(
    null,
    uint8.slice(0, Math.min(2000, uint8.length))
  );

  return scan.includes("facet") || scan.includes("vertex");
}

// --------------------------------------------------
// BINARY STL PARSER (optimized & safe)
// --------------------------------------------------
function parseBinarySTL(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const triCount = view.getUint32(80, true);

  const vertices = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);

  let offset = 84;
  const updateRate = Math.max(5000, Math.floor(triCount / 100));

  for (let i = 0; i < triCount; i++) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    const base = i * 9;

    for (let v = 0; v < 3; v++) {
      const idx = base + v * 3;

      vertices[idx] = view.getFloat32(offset, true);
      vertices[idx + 1] = view.getFloat32(offset + 4, true);
      vertices[idx + 2] = view.getFloat32(offset + 8, true);

      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;

      offset += 12;
    }

    offset += 2;

    if (i % updateRate === 0) {
      self.postMessage({
        type: "progress",
        progress: 20 + Math.floor((i / triCount) * 70),
      });
    }
  }

  return { vertices, normals };
}

// --------------------------------------------------
// ASCII STL PARSER (non-blocking regex)
// --------------------------------------------------
function parseAsciiSTL(arrayBuffer) {
  const text = new TextDecoder().decode(arrayBuffer);

  // Faster chunk regex (NOT the huge 1-regex block)
  const facetRegex = /facet[\s\S]*?endfacet/g;

  const vertices = [];
  const normals = [];

  let match;
  let tri = 0;

  const updateRate = 3000;

  while ((match = facetRegex.exec(text)) !== null) {
    const block = match[0];

    // Normal
    const normalMatch = /normal\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/.exec(
      block
    );
    if (!normalMatch) continue;

    const nx = +normalMatch[1];
    const ny = +normalMatch[2];
    const nz = +normalMatch[3];

    // Vertices
    const verts = [...block.matchAll(/vertex\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/g)];

    if (verts.length === 3) {
      for (const v of verts) {
        vertices.push(+v[1], +v[2], +v[3]);
        normals.push(nx, ny, nz);
      }
    }

    tri++;

    if (tri % updateRate === 0) {
      self.postMessage({
        type: "progress",
        progress: 20 + (tri % 100000) * 0.0005,
      });
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
  };
}
