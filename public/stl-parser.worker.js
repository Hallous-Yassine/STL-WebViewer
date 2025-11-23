/**
 * Enhanced Web Worker for parsing STL files
 * Handles both ASCII and Binary STL formats with optimized performance
 * Runs in a separate thread to avoid blocking the UI
 */

self.onmessage = function(e) {
  const { arrayBuffer, fileName } = e.data;
  
  try {
    // Send initial progress
    self.postMessage({ type: 'progress', progress: 10 });
    
    // Determine if STL is ASCII or Binary
    const view = new Uint8Array(arrayBuffer);
    const isASCII = isAsciiSTL(view);
    
    self.postMessage({ type: 'progress', progress: 20 });
    
    let geometry;
    if (isASCII) {
      geometry = parseAsciiSTL(arrayBuffer);
    } else {
      geometry = parseBinarySTL(arrayBuffer);
    }
    
    self.postMessage({ type: 'progress', progress: 90 });
    
    // Send parsed geometry back to main thread
    self.postMessage({
      type: 'complete',
      success: true,
      vertices: geometry.vertices,
      normals: geometry.normals,
      vertexCount: geometry.vertices.length / 3,
      triangleCount: geometry.vertices.length / 9,
      format: isASCII ? 'ASCII' : 'Binary'
    }, [geometry.vertices.buffer, geometry.normals.buffer]);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      success: false,
      error: error.message
    });
  }
};

function isAsciiSTL(data) {
  // Check first 80 bytes for "solid" keyword
  // But also verify it's actually text and not binary masquerading
  try {
    const header = new TextDecoder('utf-8', { fatal: true }).decode(data.slice(0, 80));
    const isSolid = header.toLowerCase().includes('solid');
    
    // Additional check: ASCII files should have "facet" keyword within first 1000 bytes
    if (isSolid && data.length > 100) {
      const sample = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, Math.min(1000, data.length)));
      return sample.includes('facet') || sample.includes('vertex');
    }
    
    return isSolid;
  } catch {
    return false; // If decoding fails, it's binary
  }
}

function parseAsciiSTL(arrayBuffer) {
  const text = new TextDecoder().decode(arrayBuffer);
  const vertices = [];
  const normals = [];
  
  // Optimized regex patterns
  const facetPattern = /facet\s+normal\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+outer\s+loop\s+vertex\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+vertex\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+vertex\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)/g;
  
  let match;
  let triangleCount = 0;
  
  // Parse each facet (triangle) with all its data in one regex match
  while ((match = facetPattern.exec(text)) !== null) {
    // Normal
    const nx = parseFloat(match[1]);
    const ny = parseFloat(match[2]);
    const nz = parseFloat(match[3]);
    
    // Vertex 1
    vertices.push(parseFloat(match[4]), parseFloat(match[5]), parseFloat(match[6]));
    normals.push(nx, ny, nz);
    
    // Vertex 2
    vertices.push(parseFloat(match[7]), parseFloat(match[8]), parseFloat(match[9]));
    normals.push(nx, ny, nz);
    
    // Vertex 3
    vertices.push(parseFloat(match[10]), parseFloat(match[11]), parseFloat(match[12]));
    normals.push(nx, ny, nz);
    
    triangleCount++;
    
    // Report progress every 10000 triangles
    if (triangleCount % 10000 === 0) {
      self.postMessage({ type: 'progress', progress: 20 + (triangleCount / 100000) * 50 });
    }
  }
  
  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals)
  };
}

function parseBinarySTL(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // Binary STL format:
  // 80 bytes header
  // 4 bytes triangle count (uint32, little-endian)
  // For each triangle (50 bytes total):
  //   12 bytes normal (3 × float32)
  //   36 bytes vertices (3 vertices × 3 × float32)
  //   2 bytes attribute byte count (uint16)
  
  const triangleCount = view.getUint32(80, true);
  
  // Pre-allocate typed arrays for better performance
  const vertices = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);
  
  let offset = 84;
  const progressInterval = Math.max(1, Math.floor(triangleCount / 50));
  
  for (let i = 0; i < triangleCount; i++) {
    // Read normal (12 bytes)
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;
    
    const baseIndex = i * 9;
    
    // Read 3 vertices (36 bytes total)
    for (let j = 0; j < 3; j++) {
      const idx = baseIndex + j * 3;
      
      vertices[idx] = view.getFloat32(offset, true);
      vertices[idx + 1] = view.getFloat32(offset + 4, true);
      vertices[idx + 2] = view.getFloat32(offset + 8, true);
      offset += 12;
      
      // Same normal for all 3 vertices of the triangle
      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;
    }
    
    // Skip attribute byte count (2 bytes)
    offset += 2;
    
    // Report progress periodically
    if (i % progressInterval === 0) {
      self.postMessage({ 
        type: 'progress', 
        progress: 20 + Math.floor((i / triangleCount) * 70)
      });
    }
  }
  
  return {
    vertices,
    normals
  };
}