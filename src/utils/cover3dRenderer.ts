/**
 * 3D Cover Rendering Engine
 * Converts 2D front cover images into 3D box art with spine, perspective angle,
 * lighting sheen, and realistic drop shadow.
 */

export type Cover3dStyle =
  | 'standard'
  | 'box_with_cd'
  | 'cartridge_gb'
  | 'cartridge_md'
  | 'cartridge_snes'
  | 'jewel';
export type Cover3dDirection = 'left' | 'right';
export type SpineMode = 'stretch' | 'color' | 'title';
export type SpineColorType = 'auto' | 'black' | 'white' | 'dark';

export interface Cover3dOptions {
  style?: Cover3dStyle;
  direction?: Cover3dDirection; // 'left' = faces towards list (default), 'right' = faces right
  angle?: number; // 15 to 45 degrees
  spineWidthRatio?: number; // 0.08 to 0.25
  glossOpacity?: number; // 0.0 to 0.6
  shadowOpacity?: number; // 0.0 to 0.8
  spineMode?: SpineMode; // 'stretch' = 1px edge extrusion, 'color' = solid sampled color, 'title' = custom title on spine
  spineColorType?: SpineColorType; // background color for title spine
  spineTitleText?: string; // game title to print vertically on the spine
  spineAccent?: 'auto' | 'dark' | 'light' | 'snes' | 'megadrive' | 'ps1';
  templateDimensions?: { width: number; height: number }; // Dimensions from Template.png
  outputWidth?: number;
  outputHeight?: number;
}

export interface ConvertedCoverItem {
  id: string;
  filename: string;
  originalName: string;
  originalImage: HTMLImageElement;
  objectUrl?: string;
  renderedCanvas?: HTMLCanvasElement;
  renderedDataUrl?: string;
  renderedBlob?: Blob;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  lastModified?: number;
  isNew?: boolean;
  alreadyConverted?: boolean;
  fileHandle?: any;
  parentDirHandle?: any;
}

/**
 * Extracts a clean display game title from a ROM/cover filename.
 * Strips extensions, regions (USA, Europe, etc.), and dump tags ([!], [b1], etc.)
 */
export function cleanGameTitle(filename: string): string {
  // Strip extension
  let title = filename.replace(/\.[^/.]+$/, '');
  // Remove parenthesis tags (USA), (Europe, USA), (Rev 1), etc.
  title = title.replace(/\s*\([^)]*\)/g, '');
  // Remove bracket tags [!], [b1], [t1], etc.
  title = title.replace(/\s*\[[^\]]*\]/g, '');
  // Clean double spaces and trim
  title = title.replace(/\s{2,}/g, ' ').trim();
  return title || filename.replace(/\.[^/.]+$/, '');
}

/**
 * Loads an image from a File or Blob object, returning both the HTMLImageElement
 * and the valid objectUrl for UI rendering.
 */
export function loadImageFromFile(file: File | Blob): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Do NOT revoke immediately so the browser can keep displaying the image/thumbnail in the UI
      resolve({ img, objectUrl });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

/**
 * Loads an image from a URL or Data URI.
 */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Extracts average color from a vertical stripe of an image (e.g. left edge for spine).
 */
export function extractEdgeColor(
  img: HTMLImageElement,
  side: 'left' | 'right' = 'left',
  widthPct: number = 0.05
): { r: number; g: number; b: number; hex: string } {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 30, g: 30, b: 35, hex: '#1e1e23' };

  const sampleW = Math.max(1, Math.floor(img.width * widthPct));
  const srcX = side === 'left' ? 0 : img.width - sampleW;

  ctx.drawImage(img, srcX, 0, sampleW, img.height, 0, 0, 32, 32);
  const data = ctx.getImageData(0, 0, 32, 32).data;

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  return { r, g, b, hex };
}

/**
 * Extracts average color from the top horizontal edge of the image.
 */
export function extractTopEdgeColor(img: HTMLImageElement): { r: number; g: number; b: number; hex: string } {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 60, g: 60, b: 65, hex: '#3c3c41' };

  ctx.drawImage(img, 0, 0, img.width, Math.max(1, Math.floor(img.height * 0.05)), 0, 0, 32, 32);
  const data = ctx.getImageData(0, 0, 32, 32).data;

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  r = Math.round(r / Math.max(1, count));
  g = Math.round(g / Math.max(1, count));
  b = Math.round(b / Math.max(1, count));
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  return { r, g, b, hex };
}

/**
 * Renders a 2D cover image into a 3D box on a Canvas.
 */
export function render3dBox(
  img: HTMLImageElement,
  options: Cover3dOptions = {}
): HTMLCanvasElement {
  const {
    style = 'standard',
    direction = 'left',
    angle = 26,
    spineWidthRatio = 0.065,
    glossOpacity = 0.22,
    shadowOpacity = 0.45,
    spineMode = 'stretch',
    spineColorType = 'auto',
    spineTitleText = '',
    templateDimensions,
    outputWidth = 650,
    outputHeight = 650,
  } = options;

  // Dedicated visual mockup styles
  if (style === 'cartridge_gb') {
    return renderCartridgeGB(img, options);
  }
  if (style === 'cartridge_md') {
    return renderCartridgeMD(img, options);
  }
  if (style === 'cartridge_snes') {
    return renderCartridgeSNES(img, options);
  }
  if (style === 'jewel') {
    return renderJewelCase(img, options);
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Calculate aspect ratio
  // If templateDimensions are provided (from Template.png), use its aspect ratio so all boxes have uniform proportions
  const imgAspect =
    templateDimensions && templateDimensions.width > 0 && templateDimensions.height > 0
      ? templateDimensions.width / templateDimensions.height
      : img.width / img.height;

  const rad = (angle * Math.PI) / 180;

  // Available viewport space
  const padding = 44;
  const availW = outputWidth - padding * 2;
  const availH = outputHeight - padding * 2;

  // Base dimensions - Realistic slim game case
  let boxH = availH * 0.82;
  let frontW = boxH * imgAspect;
  const spineW = frontW * spineWidthRatio;

  // Perspective projection widths (sleek, authentic spine thickness)
  let frontProjW = frontW * Math.cos(rad);
  let spineProjW = Math.max(6, spineW * (Math.sin(rad) * 0.95 + 0.12));
  let totalProjW = frontProjW + spineProjW;

  // Fit into bounds if needed
  if (totalProjW > availW) {
    const scale = availW / totalProjW;
    boxH *= scale;
    frontW *= scale;
    frontProjW *= scale;
    spineProjW *= scale;
    totalProjW = availW;
  }

  // True 2-Point Central Perspective
  // The crease (closest vertical fold) is tallest and centered at the optical horizon
  const centerY = outputHeight / 2 - 8;
  const startX = (outputWidth - totalProjW) / 2;

  // Symmetrical perspective tapers towards left and right vanishing points
  const frontTaper = Math.sin(rad) * 0.22;
  const spineTaper = Math.cos(rad) * 0.28;

  const isLeft = direction === 'left';

  // Crease vertical coordinates (closest edge to camera)
  const creaseTopY = centerY - boxH / 2;
  const creaseBottomY = centerY + boxH / 2;

  // Geometry configuration based on direction
  let creaseX: number;
  let leftOuterX: number;
  let rightOuterX: number;
  let frontP: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  };
  let spineP: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  };
  let roofP: {
    left: { x: number; y: number };
    front: { x: number; y: number };
    right: { x: number; y: number };
    back: { x: number; y: number };
  };

  const roofDepthY = boxH * 0.042;

  if (isLeft) {
    // FACING LEFT (Towards the list):
    // Front cover is on the LEFT, Spine is on the RIGHT
    creaseX = startX + frontProjW;
    leftOuterX = startX;
    rightOuterX = startX + totalProjW;

    const frontOuterH = boxH * (1 - frontTaper);
    const frontOuterTopY = centerY - frontOuterH / 2;
    const frontOuterBottomY = centerY + frontOuterH / 2;

    const spineOuterH = boxH * (1 - spineTaper);
    const spineOuterTopY = centerY - spineOuterH / 2;
    const spineOuterBottomY = centerY + spineOuterH / 2;

    frontP = {
      topLeft: { x: leftOuterX, y: frontOuterTopY },
      topRight: { x: creaseX, y: creaseTopY },
      bottomRight: { x: creaseX, y: creaseBottomY },
      bottomLeft: { x: leftOuterX, y: frontOuterBottomY },
    };

    spineP = {
      topLeft: { x: creaseX, y: creaseTopY },
      topRight: { x: rightOuterX, y: spineOuterTopY },
      bottomRight: { x: rightOuterX, y: spineOuterBottomY },
      bottomLeft: { x: creaseX, y: creaseBottomY },
    };

    roofP = {
      left: { x: leftOuterX, y: frontOuterTopY },
      front: { x: creaseX, y: creaseTopY },
      right: { x: rightOuterX, y: spineOuterTopY },
      back: {
        x: leftOuterX + (rightOuterX - creaseX) * 0.94,
        y: frontOuterTopY + (spineOuterTopY - creaseTopY) - roofDepthY,
      },
    };
  } else {
    // FACING RIGHT:
    // Spine is on the LEFT, Front cover is on the RIGHT
    creaseX = startX + spineProjW;
    leftOuterX = startX;
    rightOuterX = startX + totalProjW;

    const spineOuterH = boxH * (1 - spineTaper);
    const spineOuterTopY = centerY - spineOuterH / 2;
    const spineOuterBottomY = centerY + spineOuterH / 2;

    const frontOuterH = boxH * (1 - frontTaper);
    const frontOuterTopY = centerY - frontOuterH / 2;
    const frontOuterBottomY = centerY + frontOuterH / 2;

    spineP = {
      topLeft: { x: leftOuterX, y: spineOuterTopY },
      topRight: { x: creaseX, y: creaseTopY },
      bottomRight: { x: creaseX, y: creaseBottomY },
      bottomLeft: { x: leftOuterX, y: spineOuterBottomY },
    };

    frontP = {
      topLeft: { x: creaseX, y: creaseTopY },
      topRight: { x: rightOuterX, y: frontOuterTopY },
      bottomRight: { x: rightOuterX, y: frontOuterBottomY },
      bottomLeft: { x: creaseX, y: creaseBottomY },
    };

    roofP = {
      left: { x: leftOuterX, y: spineOuterTopY },
      front: { x: creaseX, y: creaseTopY },
      right: { x: rightOuterX, y: frontOuterTopY },
      back: {
        x: rightOuterX + (leftOuterX - creaseX) * 0.94,
        y: frontOuterTopY + (spineOuterTopY - creaseTopY) - roofDepthY,
      },
    };
  }

  // 1. DROP SHADOW (Realistic floor contact shadow)
  if (shadowOpacity > 0) {
    ctx.save();
    const shadowCenterY = creaseBottomY + 12;
    const shadowH = 26;
    const shadowW = totalProjW * 0.58;

    const shadowGrad = ctx.createRadialGradient(
      startX + totalProjW * 0.5,
      shadowCenterY,
      8,
      startX + totalProjW * 0.5,
      shadowCenterY,
      shadowW
    );
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity * 0.9})`);
    shadowGrad.addColorStop(0.4, `rgba(0, 0, 0, ${shadowOpacity * 0.45})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(
      startX + totalProjW * 0.5,
      shadowCenterY,
      shadowW,
      shadowH,
      isLeft ? 0.04 : -0.04,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // 2. TOP LID (Realistic perspective carton top)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(roofP.left.x, roofP.left.y);
  ctx.lineTo(roofP.front.x, roofP.front.y);
  ctx.lineTo(roofP.right.x, roofP.right.y);
  ctx.lineTo(roofP.back.x, roofP.back.y);
  ctx.closePath();

  const topCol = extractTopEdgeColor(img);
  ctx.fillStyle = topCol.hex;
  ctx.fill();

  // Top lid lighting gradient
  const roofGrad = ctx.createLinearGradient(
    roofP.left.x,
    roofP.back.y,
    roofP.right.x,
    roofP.front.y
  );
  roofGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  roofGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  roofGrad.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = roofGrad;
  ctx.fill();

  // Subtle border around roof
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // 3. SPINE (Side Face in 2-Point Perspective)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(spineP.topLeft.x, spineP.topLeft.y);
  ctx.lineTo(spineP.topRight.x, spineP.topRight.y);
  ctx.lineTo(spineP.bottomRight.x, spineP.bottomRight.y);
  ctx.lineTo(spineP.bottomLeft.x, spineP.bottomLeft.y);
  ctx.closePath();
  ctx.clip();

  // Background fallback color for spine
  const edgeCol = extractEdgeColor(img, isLeft ? 'right' : 'left', 0.04);
  ctx.fillStyle = edgeCol.hex;
  ctx.fillRect(startX - 20, creaseTopY - 20, totalProjW + 40, boxH + 40);

  const spineSpanW = spineP.topRight.x - spineP.topLeft.x;
  if (spineMode === 'title' && spineSpanW > 0) {
    // 3D SPINE WITH GAME TITLE (Authentic retro box spine with vertical title)
    const spineCanvas = document.createElement('canvas');
    const spineResW = Math.max(90, Math.round(spineW * 2.5));
    const spineResH = Math.max(340, Math.round(boxH * 2.5));
    spineCanvas.width = spineResW;
    spineCanvas.height = spineResH;
    const sCtx = spineCanvas.getContext('2d');

    if (sCtx) {
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';

      // 1. Spine background color selection
      let bgR = edgeCol.r;
      let bgG = edgeCol.g;
      let bgB = edgeCol.b;
      let bgHex = edgeCol.hex;

      if (spineColorType === 'black') {
        bgR = 16; bgG = 16; bgB = 20;
        bgHex = '#101014';
      } else if (spineColorType === 'white') {
        bgR = 246; bgG = 246; bgB = 248;
        bgHex = '#f6f6f8';
      } else if (spineColorType === 'dark') {
        bgR = Math.round(edgeCol.r * 0.3);
        bgG = Math.round(edgeCol.g * 0.3);
        bgB = Math.round(edgeCol.b * 0.3);
        bgHex = `#${((1 << 24) + (bgR << 16) + (bgG << 8) + bgB).toString(16).slice(1)}`;
      }

      sCtx.fillStyle = bgHex;
      sCtx.fillRect(0, 0, spineResW, spineResH);

      // Subtle fold gradient / texture along spine edges
      const spineInnerGrad = sCtx.createLinearGradient(0, 0, spineResW, 0);
      spineInnerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      spineInnerGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.0)');
      spineInnerGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.0)');
      spineInnerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      sCtx.fillStyle = spineInnerGrad;
      sCtx.fillRect(0, 0, spineResW, spineResH);

      // 2. Retro Spine Accents (Top & Bottom bands)
      const isDark = (bgR * 299 + bgG * 587 + bgB * 114) / 1000 < 135;

      // Top colored accent band (classic retro box header)
      sCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
      sCtx.fillRect(0, 0, spineResW, Math.max(6, Math.round(spineResH * 0.035)));

      // Subtle bottom band / region bar
      sCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
      sCtx.fillRect(0, spineResH - Math.max(8, Math.round(spineResH * 0.045)), spineResW, Math.max(8, Math.round(spineResH * 0.045)));

      // 3. Vertical Game Title Text
      const rawTitle = spineTitleText.trim();
      const displayTitle = rawTitle ? cleanGameTitle(rawTitle) : '';

      if (displayTitle) {
        sCtx.save();
        sCtx.translate(spineResW / 2, spineResH / 2);
        // Rotate 90 degrees clockwise so text reads downwards (Western retro standard)
        sCtx.rotate(Math.PI / 2);
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';

        // Auto font size calculation to fit spine width and height
        const targetFontSize = Math.min(
          Math.max(13, Math.round(spineResW * 0.44)),
          34
        );
        sCtx.font = `900 ${targetFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        if (isDark) {
          sCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          sCtx.shadowBlur = 4;
          sCtx.shadowOffsetY = 1;
          sCtx.fillStyle = '#ffffff';
        } else {
          sCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          sCtx.shadowBlur = 2;
          sCtx.shadowOffsetY = 1;
          sCtx.fillStyle = '#111827';
        }

        // Available vertical length for title (leaving margins for top & bottom accents)
        const maxTextLength = spineResH * 0.74;
        sCtx.fillText(displayTitle, 0, 0, maxTextLength);
        sCtx.restore();
      }

      // 4. Perspective Slicing: project spineCanvas across spine quad
      const numSpineSlices = Math.max(20, Math.ceil(spineSpanW * 1.5));
      const spineSliceW = spineSpanW / numSpineSlices;
      const srcSpineSliceW = spineCanvas.width / numSpineSlices;

      for (let j = 0; j < numSpineSlices; j++) {
        const s = j / numSpineSlices;
        const destX = spineP.topLeft.x + s * spineSpanW;
        const curTopY = spineP.topLeft.y + s * (spineP.topRight.y - spineP.topLeft.y);
        const curBottomY = spineP.bottomLeft.y + s * (spineP.bottomRight.y - spineP.bottomLeft.y);
        const curH = curBottomY - curTopY;

        ctx.drawImage(
          spineCanvas,
          j * srcSpineSliceW,
          0,
          srcSpineSliceW,
          spineCanvas.height,
          destX,
          curTopY,
          spineSliceW + 0.6,
          curH
        );
      }
    }
  } else if (spineMode === 'stretch' && spineSpanW > 0) {
    // 1D Edge Extrusion: stretches 1px from the image edge that connects to the crease!
    const sourceColX = isLeft ? img.width - 1 : 0;
    const numSpineSlices = Math.max(14, Math.ceil(spineSpanW));
    const spineSliceW = spineSpanW / numSpineSlices;

    for (let j = 0; j < numSpineSlices; j++) {
      const s = j / numSpineSlices;
      const destX = spineP.topLeft.x + s * spineSpanW;
      const curTopY = spineP.topLeft.y + s * (spineP.topRight.y - spineP.topLeft.y);
      const curBottomY = spineP.bottomLeft.y + s * (spineP.bottomRight.y - spineP.bottomLeft.y);
      const curH = curBottomY - curTopY;

      ctx.drawImage(
        img,
        sourceColX,
        0,
        1,
        img.height,
        destX,
        curTopY,
        spineSliceW + 0.6,
        curH
      );
    }
  }

  // Spine Lighting Gradient
  const spineGrad = ctx.createLinearGradient(
    spineP.topLeft.x,
    0,
    spineP.topRight.x,
    0
  );
  if (isLeft) {
    // Crease is on left (lighter), outer edge on right (darker)
    spineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    spineGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.15)');
    spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
  } else {
    // Outer edge on left (darker), crease on right (lighter)
    spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    spineGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
    spineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  }
  ctx.fillStyle = spineGrad;
  ctx.fillRect(startX - 20, creaseTopY - 20, totalProjW + 40, boxH + 40);
  ctx.restore();

  // 4. FRONT COVER (Perspective Slices)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(frontP.topLeft.x, frontP.topLeft.y);
  ctx.lineTo(frontP.topRight.x, frontP.topRight.y);
  ctx.lineTo(frontP.bottomRight.x, frontP.bottomRight.y);
  ctx.lineTo(frontP.bottomLeft.x, frontP.bottomLeft.y);
  ctx.closePath();
  ctx.clip();

  const frontSpanW = frontP.topRight.x - frontP.topLeft.x;
  const numSlices = Math.min(220, Math.ceil(frontSpanW * 1.5));
  const sliceW = frontSpanW / numSlices;
  const srcSliceW = img.width / numSlices;

  for (let i = 0; i < numSlices; i++) {
    const t = i / numSlices;
    const destX = frontP.topLeft.x + t * frontSpanW;
    const curTopY = frontP.topLeft.y + t * (frontP.topRight.y - frontP.topLeft.y);
    const curBottomY = frontP.bottomLeft.y + t * (frontP.bottomRight.y - frontP.bottomLeft.y);
    const curH = curBottomY - curTopY;

    ctx.drawImage(
      img,
      i * srcSliceW,
      0,
      srcSliceW,
      img.height,
      destX,
      curTopY,
      sliceW + 0.6,
      curH
    );
  }

  // 5. GLOSS & SPECULAR LIGHTING
  if (glossOpacity > 0) {
    const glossGrad = ctx.createLinearGradient(
      frontP.topLeft.x,
      frontP.topLeft.y,
      frontP.bottomRight.x,
      frontP.bottomRight.y
    );
    glossGrad.addColorStop(0, `rgba(255, 255, 255, ${glossOpacity * 1.15})`);
    glossGrad.addColorStop(0.35, `rgba(255, 255, 255, ${glossOpacity * 0.55})`);
    glossGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.04)');
    glossGrad.addColorStop(1, 'rgba(0, 0, 0, 0.16)');

    ctx.fillStyle = glossGrad;
    ctx.fillRect(frontP.topLeft.x - 5, creaseTopY - 10, frontSpanW + 10, boxH + 20);
  }
  ctx.restore();

  // 6. CREASE FOLD HIGHLIGHT (At the spine/front joint)
  ctx.save();
  // Dark crease line on spine side
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const creaseDarkOffset = isLeft ? 0.5 : -0.5;
  ctx.moveTo(creaseX + creaseDarkOffset, creaseTopY);
  ctx.lineTo(creaseX + creaseDarkOffset, creaseBottomY);
  ctx.stroke();

  // Crisp light highlight on front cover side
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const creaseLightOffset = isLeft ? -0.5 : 0.5;
  ctx.moveTo(creaseX + creaseLightOffset, creaseTopY);
  ctx.lineTo(creaseX + creaseLightOffset, creaseBottomY);
  ctx.stroke();

  // Crisp outline on outer edges
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  // Left outer edge
  ctx.moveTo(leftOuterX, isLeft ? frontP.topLeft.y : spineP.topLeft.y);
  ctx.lineTo(leftOuterX, isLeft ? frontP.bottomLeft.y : spineP.bottomLeft.y);
  // Right outer edge
  ctx.moveTo(rightOuterX, isLeft ? spineP.topRight.y : frontP.topRight.y);
  ctx.lineTo(rightOuterX, isLeft ? spineP.bottomRight.y : frontP.bottomRight.y);
  ctx.stroke();
  ctx.restore();

  // 7. Visual Mockup: CD-ROM in front of the 3D Box
  if (style === 'box_with_cd') {
    renderCdInFront(ctx, {
      creaseX,
      creaseBottomY,
      centerY,
      boxH,
      frontSpanW,
      leftOuterX,
      rightOuterX,
      isLeft,
      outputWidth,
      outputHeight,
    });
  }

  return canvas;
}

/**
 * Helper to draw a rounded rectangle on a CanvasRenderingContext2D.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
) {
  let tl = 0, tr = 0, br = 0, bl = 0;
  if (typeof radius === 'number') {
    tl = tr = br = bl = radius;
  } else {
    tl = radius.tl; tr = radius.tr; br = radius.br; bl = radius.bl;
  }
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/**
 * Renders a photorealistic optical CD-ROM / Disc positioned on the right side of the 3D box.
 * Placed in the upper-middle area on the right edge, so the front cover artwork remains
 * completely visible while creating an authentic retail mockup presentation.
 */
function renderCdInFront(
  ctx: CanvasRenderingContext2D,
  params: {
    creaseX: number;
    creaseBottomY: number;
    centerY?: number;
    boxH: number;
    frontSpanW: number;
    leftOuterX: number;
    rightOuterX: number;
    isLeft: boolean;
    outputWidth: number;
    outputHeight: number;
  }
) {
  const { creaseBottomY, boxH, rightOuterX, outputWidth } = params;
  const centerY = params.centerY ?? (creaseBottomY - boxH / 2);

  // Realistic disc radius (~22% of box height) - compact and non-obtrusive
  const cdRadius = boxH * 0.22;

  // Position in the bottom corner of the packaging (down in the corner)
  const cornerBottomY = params.isLeft ? creaseBottomY : (creaseBottomY - boxH * 0.04);
  const maxCdX = outputWidth - cdRadius - 14;
  const cdX = Math.min(maxCdX, rightOuterX - cdRadius * 0.35);
  const cdY = cornerBottomY - cdRadius * 0.55;

  ctx.save();

  // 1. Soft contact shadow on the box and floor behind the CD
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = -3;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.arc(cdX, cdY, cdRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Base Silver Metallic Surface of the Disc
  const baseGrad = ctx.createLinearGradient(
    cdX - cdRadius,
    cdY - cdRadius,
    cdX + cdRadius,
    cdY + cdRadius
  );
  baseGrad.addColorStop(0, '#f4f7fa');
  baseGrad.addColorStop(0.3, '#dce3ea');
  baseGrad.addColorStop(0.7, '#c0c9d2');
  baseGrad.addColorStop(1, '#9ba7b2');

  ctx.beginPath();
  ctx.arc(cdX, cdY, cdRadius, 0, Math.PI * 2);
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // Outer rim edge
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.stroke();

  // 3. Iridescent Holographic Diffraction Sheen (The signature CD rainbow light refraction)
  const rainbowColors = [
    'rgba(255, 60, 140, 0.36)',  // hot magenta
    'rgba(255, 170, 0, 0.38)',   // orange-amber
    'rgba(255, 240, 0, 0.40)',   // spectral yellow
    'rgba(0, 240, 160, 0.38)',   // emerald green
    'rgba(0, 190, 255, 0.42)',   // electric cyan
    'rgba(170, 80, 255, 0.36)',  // royal purple
  ];

  // Draw opposing rainbow fan reflection cones
  const angles = [-0.65, 0.9];
  for (const baseAngle of angles) {
    ctx.save();
    ctx.translate(cdX, cdY);
    ctx.rotate(baseAngle);

    const fanGrad = ctx.createLinearGradient(-cdRadius, 0, cdRadius, 0);
    fanGrad.addColorStop(0.0, rainbowColors[0]);
    fanGrad.addColorStop(0.2, rainbowColors[1]);
    fanGrad.addColorStop(0.4, rainbowColors[2]);
    fanGrad.addColorStop(0.6, rainbowColors[3]);
    fanGrad.addColorStop(0.8, rainbowColors[4]);
    fanGrad.addColorStop(1.0, rainbowColors[5]);

    ctx.fillStyle = fanGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, cdRadius * 0.98, -0.6, 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 4. Concentric Data Track Rings
  ctx.save();
  ctx.lineWidth = 0.6;
  const numRings = 14;
  for (let r = 0; r < numRings; r++) {
    const ringRadius = cdRadius * (0.42 + (r / numRings) * 0.54);
    ctx.strokeStyle = r % 2 === 0 ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.arc(cdX, cdY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Clear Inner Hub (Translucent plastic center)
  const hubRadius = cdRadius * 0.36;
  const hubGrad = ctx.createRadialGradient(cdX, cdY, 2, cdX, cdY, hubRadius);
  hubGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  hubGrad.addColorStop(0.6, 'rgba(235, 240, 248, 0.72)');
  hubGrad.addColorStop(1, 'rgba(200, 210, 225, 0.85)');

  ctx.beginPath();
  ctx.arc(cdX, cdY, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Clamping ring groove
  const clampRadius = cdRadius * 0.22;
  ctx.beginPath();
  ctx.arc(cdX, cdY, clampRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Spindle center hole (Cutout showing dark hub center)
  const holeRadius = cdRadius * 0.12;
  const holeGrad = ctx.createRadialGradient(cdX, cdY, 1, cdX, cdY, holeRadius);
  holeGrad.addColorStop(0, '#10141a');
  holeGrad.addColorStop(0.8, '#1e2530');
  holeGrad.addColorStop(1, '#3b4554');
  ctx.beginPath();
  ctx.arc(cdX, cdY, holeRadius, 0, Math.PI * 2);
  ctx.fillStyle = holeGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 6. Dual Specular Gleams (High-gloss reflective white streaks across the entire disc)
  const gleamGrad = ctx.createLinearGradient(
    cdX - cdRadius * 0.8,
    cdY - cdRadius * 0.8,
    cdX + cdRadius * 0.8,
    cdY + cdRadius * 0.8
  );
  gleamGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.42)');
  gleamGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.14)');
  gleamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
  gleamGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.14)');
  gleamGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.42)');

  ctx.beginPath();
  ctx.arc(cdX, cdY, cdRadius, 0, Math.PI * 2);
  ctx.fillStyle = gleamGrad;
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the cover artwork onto a target rectangle without ANY stretching or distortion,
 * strictly preserving its natural aspect ratio (img.naturalWidth / img.naturalHeight).
 * Features an authentic cartridge/booklet sticker background, soft ambient backdrop,
 * and high-gloss diagonal shine.
 */
function drawCoverPreservingAspect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    cornerRadius?: number;
    ambientBackdrop?: boolean;
    glossOpacity?: number;
    platform?: 'gb' | 'md' | 'snes' | 'jewel';
  } = {}
) {
  const {
    cornerRadius = 6,
    ambientBackdrop = true,
    glossOpacity = 0.25,
    platform,
  } = options;

  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;
  const imgAspect = naturalW / naturalH;
  const areaAspect = w / h;

  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, cornerRadius);
  ctx.clip();

  // 1. Sleek authentic sticker background
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  if (platform === 'md') {
    bgGrad.addColorStop(0, '#101216');
    bgGrad.addColorStop(1, '#08090c');
  } else if (platform === 'snes') {
    bgGrad.addColorStop(0, '#1c1f26');
    bgGrad.addColorStop(1, '#111317');
  } else {
    bgGrad.addColorStop(0, '#22262e');
    bgGrad.addColorStop(1, '#15171c');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 2. Ambient backdrop (if aspect ratio differs, so letterboxing looks organic and intentional)
  const isAspectSignificantlyDifferent = Math.abs(imgAspect - areaAspect) > 0.03;
  if (ambientBackdrop && isAspectSignificantlyDifferent) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(img, x, y, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // 3. Calculate exact fitted dimensions (strictly preserving aspect ratio - NO stretching!)
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;

  if (imgAspect > areaAspect) {
    // Image is wider than container: fit to width, center vertically
    drawW = w;
    drawH = w / imgAspect;
    drawY = y + (h - drawH) / 2;
  } else {
    // Image is taller than container: fit to height, center horizontally
    drawH = h;
    drawW = h * imgAspect;
    drawX = x + (w - drawW) / 2;
  }

  // Draw the original artwork in its 100% true proportions
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // Subtle clean border around the artwork if letterboxed/pillarboxed
  if (isAspectSignificantlyDifferent) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX, drawY, drawW, drawH);
  }

  // 4. Platform-specific retro label detailing
  if (platform === 'md') {
    // Classic Sega red/gold top stripe
    const barH = Math.max(7, h * 0.05);
    ctx.fillStyle = '#e52521';
    ctx.fillRect(x, y, w, barH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y + barH, w, 1);
  } else if (platform === 'snes' && isAspectSignificantlyDifferent && drawX > x + 8) {
    // On SNES wide cartridges, add a subtle classic left banner accent
    ctx.fillStyle = 'rgba(235, 30, 40, 0.85)';
    ctx.fillRect(x, y, 4, h);
  }

  // 5. High-gloss reflection across the sticker
  if (glossOpacity > 0) {
    const stickerGloss = ctx.createLinearGradient(x, y, x + w, y + h);
    stickerGloss.addColorStop(0, `rgba(255, 255, 255, ${glossOpacity * 1.3})`);
    stickerGloss.addColorStop(0.35, `rgba(255, 255, 255, ${glossOpacity * 0.4})`);
    stickerGloss.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
    stickerGloss.addColorStop(1, 'rgba(0, 0, 0, 0.14)');
    ctx.fillStyle = stickerGloss;
    ctx.fillRect(x, y, w, h);
  }

  // Outer sticker crisp border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders an authentic, crystal-clear CD Jewel Case mockup.
 * Features:
 * - Real square CD proportion (142mm x 125mm)
 * - Transparent clear acrylic shell with glass reflection & edge refraction
 * - Iconic black ribbed molded tray spine with vertical grip ridges and hinge pins
 * - Signature crescent retaining tabs (clips) holding the paper booklet
 * - Undistorted cover booklet preserving natural image proportions
 */
export function renderJewelCase(
  img: HTMLImageElement,
  options: Cover3dOptions = {}
): HTMLCanvasElement {
  const {
    direction = 'left',
    angle = 24,
    glossOpacity = 0.35,
    shadowOpacity = 0.44,
    outputWidth = 650,
    outputHeight = 650,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const rad = (angle * Math.PI) / 180;
  const isLeft = direction === 'left';

  // Standard CD jewel case proportion: nearly square (1.10 : 1)
  const padding = 44;
  const availW = outputWidth - padding * 2;
  const availH = outputHeight - padding * 2;

  let caseH = availH * 0.78;
  let caseW = caseH * 1.08; // slightly wider than high, exactly like real 142x125mm jewel case
  const spineW = caseW * 0.055; // slim CD spine (10mm thick case!)

  let frontProjW = caseW * Math.cos(rad);
  let spineProjW = Math.max(12, spineW * (Math.sin(rad) * 0.95 + 0.12));
  let totalProjW = frontProjW + spineProjW;

  if (totalProjW > availW) {
    const scale = availW / totalProjW;
    caseH *= scale;
    caseW *= scale;
    frontProjW *= scale;
    spineProjW *= scale;
    totalProjW = availW;
  }

  const centerY = outputHeight / 2 - 6;
  const startX = (outputWidth - totalProjW) / 2;

  const frontTaper = Math.sin(rad) * 0.20;
  const spineTaper = Math.cos(rad) * 0.25;

  const creaseTopY = centerY - caseH / 2;
  const creaseBottomY = centerY + caseH / 2;

  let creaseX: number;
  let leftOuterX: number;
  let rightOuterX: number;
  let frontP: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  };
  let spineP: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  };

  if (isLeft) {
    creaseX = startX + frontProjW;
    leftOuterX = startX;
    rightOuterX = startX + totalProjW;

    const frontOuterH = caseH * (1 - frontTaper);
    const frontOuterTopY = centerY - frontOuterH / 2;
    const frontOuterBottomY = centerY + frontOuterH / 2;

    const spineOuterH = caseH * (1 - spineTaper);
    const spineOuterTopY = centerY - spineOuterH / 2;
    const spineOuterBottomY = centerY + spineOuterH / 2;

    frontP = {
      topLeft: { x: leftOuterX, y: frontOuterTopY },
      topRight: { x: creaseX, y: creaseTopY },
      bottomRight: { x: creaseX, y: creaseBottomY },
      bottomLeft: { x: leftOuterX, y: frontOuterBottomY },
    };

    spineP = {
      topLeft: { x: creaseX, y: creaseTopY },
      topRight: { x: rightOuterX, y: spineOuterTopY },
      bottomRight: { x: rightOuterX, y: spineOuterBottomY },
      bottomLeft: { x: creaseX, y: creaseBottomY },
    };
  } else {
    creaseX = startX + spineProjW;
    leftOuterX = startX;
    rightOuterX = startX + totalProjW;

    const spineOuterH = caseH * (1 - spineTaper);
    const spineOuterTopY = centerY - spineOuterH / 2;
    const spineOuterBottomY = centerY + spineOuterH / 2;

    const frontOuterH = caseH * (1 - frontTaper);
    const frontOuterTopY = centerY - frontOuterH / 2;
    const frontOuterBottomY = centerY + frontOuterH / 2;

    spineP = {
      topLeft: { x: leftOuterX, y: spineOuterTopY },
      topRight: { x: creaseX, y: creaseTopY },
      bottomRight: { x: creaseX, y: creaseBottomY },
      bottomLeft: { x: leftOuterX, y: spineOuterBottomY },
    };

    frontP = {
      topLeft: { x: creaseX, y: creaseTopY },
      topRight: { x: rightOuterX, y: frontOuterTopY },
      bottomRight: { x: rightOuterX, y: frontOuterBottomY },
      bottomLeft: { x: creaseX, y: creaseBottomY },
    };
  }

  // 1. DROP SHADOW (Clear acrylic casts light contact shadow)
  if (shadowOpacity > 0) {
    ctx.save();
    const shadowCenterY = creaseBottomY + 10;
    const shadowW = totalProjW * 0.52;
    const shadowH = 20;

    const shadowGrad = ctx.createRadialGradient(
      startX + totalProjW * 0.5,
      shadowCenterY,
      6,
      startX + totalProjW * 0.5,
      shadowCenterY,
      shadowW
    );
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity * 0.85})`);
    shadowGrad.addColorStop(0.5, `rgba(0, 0, 0, ${shadowOpacity * 0.35})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(
      startX + totalProjW * 0.5,
      shadowCenterY,
      shadowW,
      shadowH,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // 2. THE SPINE: MOLDED BLACK RIBBED CD TRAY BEHIND CLEAR HINGE
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(spineP.topLeft.x, spineP.topLeft.y);
  ctx.lineTo(spineP.topRight.x, spineP.topRight.y);
  ctx.lineTo(spineP.bottomRight.x, spineP.bottomRight.y);
  ctx.lineTo(spineP.bottomLeft.x, spineP.bottomLeft.y);
  ctx.closePath();
  ctx.clip();

  // Dark charcoal/black ribbed plastic tray
  const trayGrad = ctx.createLinearGradient(
    spineP.topLeft.x,
    spineP.topLeft.y,
    spineP.topRight.x,
    spineP.topRight.y
  );
  trayGrad.addColorStop(0, '#1c1f26');
  trayGrad.addColorStop(0.5, '#121419');
  trayGrad.addColorStop(1, '#0b0c0f');
  ctx.fillStyle = trayGrad;
  ctx.fill();

  // Molded vertical tray ribs (the iconic gripping ridges of a CD tray!)
  const spineTopDY = spineP.topRight.y - spineP.topLeft.y;
  const spineBottomDY = spineP.bottomRight.y - spineP.bottomLeft.y;
  const spineDX = spineP.topRight.x - spineP.topLeft.x;
  const numRibs = 18;
  for (let rib = 0; rib < numRibs; rib++) {
    const t = (rib + 0.5) / numRibs;
    const rx = spineP.topLeft.x + spineDX * t;
    const ryTop = spineP.topLeft.y + spineTopDY * t + 12;
    const ryBottom = spineP.bottomLeft.y + spineBottomDY * t - 12;

    ctx.strokeStyle = rib % 2 === 0 ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rx, ryTop);
    ctx.lineTo(rx, ryBottom);
    ctx.stroke();
  }

  // Circular hinge nodes (the round pivot pins on top and bottom of CD spine)
  const nodeRadius = Math.max(3, spineProjW * 0.22);
  const nodeTopY = (spineP.topLeft.y + spineP.topRight.y) / 2 + 7;
  const nodeBottomY = (spineP.bottomLeft.y + spineP.bottomRight.y) / 2 - 7;
  const nodeX = (spineP.topLeft.x + spineP.topRight.x) / 2;

  ctx.fillStyle = '#2d333e';
  ctx.beginPath();
  ctx.arc(nodeX, nodeTopY, nodeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(nodeX, nodeBottomY, nodeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();

  // Clear polystyrene hinge refraction sheen on top of tray
  const hingeGlass = ctx.createLinearGradient(
    spineP.topLeft.x,
    spineP.topLeft.y,
    spineP.topRight.x,
    spineP.topRight.y
  );
  hingeGlass.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  hingeGlass.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
  hingeGlass.addColorStop(0.8, 'rgba(0, 0, 0, 0.25)');
  hingeGlass.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
  ctx.fillStyle = hingeGlass;
  ctx.fill();

  ctx.restore();

  // 3. FRONT COVER: SQUARE BOOKLET INSIDE CLEAR CASE
  const bezelH = 7;
  const bookletSize = 600;
  const bookletCanvas = document.createElement('canvas');
  bookletCanvas.width = bookletSize;
  bookletCanvas.height = bookletSize;
  const bCtx = bookletCanvas.getContext('2d');
  if (bCtx) {
    bCtx.imageSmoothingEnabled = true;
    bCtx.imageSmoothingQuality = 'high';

    // Booklet paper base
    bCtx.fillStyle = '#0f1115';
    bCtx.fillRect(0, 0, bookletSize, bookletSize);

    // Draw artwork strictly preserving aspect ratio
    drawCoverPreservingAspect(bCtx, img, 0, 0, bookletSize, bookletSize, {
      cornerRadius: 2,
      ambientBackdrop: true,
      platform: 'jewel',
      glossOpacity: 0.15,
    });

    // Subtle paper fold / staple crease on the left edge
    const foldGrad = bCtx.createLinearGradient(0, 0, 24, 0);
    foldGrad.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
    foldGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.12)');
    foldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bCtx.fillStyle = foldGrad;
    bCtx.fillRect(0, 0, 24, bookletSize);
  }

  // Draw the front face: clear acrylic shell with booklet inside
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(frontP.topLeft.x, frontP.topLeft.y);
  ctx.lineTo(frontP.topRight.x, frontP.topRight.y);
  ctx.lineTo(frontP.bottomRight.x, frontP.bottomRight.y);
  ctx.lineTo(frontP.bottomLeft.x, frontP.bottomLeft.y);
  ctx.closePath();
  ctx.clip();

  // Clear acrylic lid base
  ctx.fillStyle = 'rgba(230, 238, 248, 0.08)';
  ctx.fill();

  // Project the booklet canvas onto front quad with slight inset for the clear plastic lip
  const frontSpanW = Math.abs(frontP.topRight.x - frontP.topLeft.x);
  const slices = Math.max(80, Math.floor(frontSpanW));
  for (let i = 0; i < slices; i++) {
    const t = i / slices;
    const tNext = (i + 1) / slices;

    const sx = t * bookletSize;
    const sw = Math.max(1, (bookletSize / slices) * 1.05);

    const topX = frontP.topLeft.x + (frontP.topRight.x - frontP.topLeft.x) * t;
    const topY = frontP.topLeft.y + (frontP.topRight.y - frontP.topLeft.y) * t;
    const botX = frontP.bottomLeft.x + (frontP.bottomRight.x - frontP.bottomLeft.x) * t;
    const botY = frontP.bottomLeft.y + (frontP.bottomRight.y - frontP.bottomLeft.y) * t;

    const nextTopX = frontP.topLeft.x + (frontP.topRight.x - frontP.topLeft.x) * tNext;
    const nextBotX = frontP.bottomLeft.x + (frontP.bottomRight.x - frontP.bottomLeft.x) * tNext;
    const dx = (nextTopX + nextBotX) / 2 - (topX + botX) / 2;
    const sliceW = Math.max(1.1, Math.abs(dx) + 0.4);

    const destX = Math.min(topX, nextTopX);
    const destY = topY + bezelH;
    const destH = Math.max(1, botY - topY - bezelH * 2);

    ctx.drawImage(bookletCanvas, sx, 0, sw, bookletSize, destX, destY, sliceW, destH);
  }

  // 4. THE SIGNATURE JEWEL CASE CRESCENT TABS (Booklet retaining clips on the opening edge)
  const openEdgeX = isLeft ? frontP.topLeft.x : frontP.topRight.x;
  const openEdgeTopY = isLeft ? frontP.topLeft.y : frontP.topRight.y;
  const openEdgeBotY = isLeft ? frontP.bottomLeft.y : frontP.bottomRight.y;
  const openEdgeH = openEdgeBotY - openEdgeTopY;

  const tabY1 = openEdgeTopY + openEdgeH * 0.28;
  const tabY2 = openEdgeTopY + openEdgeH * 0.72;
  const tabRadius = 9;

  for (const ty of [tabY1, tabY2]) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(openEdgeX + (isLeft ? 4 : -4), ty, tabRadius, -Math.PI / 2, Math.PI / 2, !isLeft);
    ctx.fill();
    ctx.stroke();
    // Inner glass highlight on tab
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(openEdgeX + (isLeft ? 4 : -4), ty, tabRadius - 2, -Math.PI / 2, Math.PI / 2, !isLeft);
    ctx.stroke();
    ctx.restore();
  }

  // 5. CRYSTAL CLEAR GLASS POLARIZED GLARE (Sharp diagonal streaks across acrylic lid)
  if (glossOpacity > 0) {
    const glassGlare = ctx.createLinearGradient(
      frontP.topLeft.x,
      frontP.topLeft.y,
      frontP.bottomRight.x,
      frontP.bottomRight.y
    );
    glassGlare.addColorStop(0.0, `rgba(255, 255, 255, ${glossOpacity * 1.5})`);
    glassGlare.addColorStop(0.18, `rgba(255, 255, 255, ${glossOpacity * 0.6})`);
    glassGlare.addColorStop(0.32, 'rgba(255, 255, 255, 0.0)');
    glassGlare.addColorStop(0.55, `rgba(255, 255, 255, ${glossOpacity * 0.7})`);
    glassGlare.addColorStop(0.70, 'rgba(255, 255, 255, 0.0)');
    glassGlare.addColorStop(1.0, `rgba(255, 255, 255, ${glossOpacity * 0.4})`);
    ctx.fillStyle = glassGlare;
    ctx.fill();
  }

  // 6. CLEAR ACRYLIC PERIMETER EDGES (Outer translucent plastic casing border)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Subtle interior border where paper booklet meets plastic bezel
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();

  // Top acrylic edge (translucent roof depth)
  ctx.save();
  const roofDepthY = caseH * 0.024;
  ctx.beginPath();
  if (isLeft) {
    ctx.moveTo(frontP.topLeft.x, frontP.topLeft.y);
    ctx.lineTo(frontP.topLeft.x + spineProjW * 0.9, frontP.topLeft.y - roofDepthY);
    ctx.lineTo(frontP.topRight.x + spineProjW * 0.9, frontP.topRight.y - roofDepthY);
    ctx.lineTo(frontP.topRight.x, frontP.topRight.y);
  } else {
    ctx.moveTo(spineP.topLeft.x, spineP.topLeft.y);
    ctx.lineTo(spineP.topLeft.x + spineProjW * 0.9, spineP.topLeft.y - roofDepthY);
    ctx.lineTo(frontP.topRight.x + spineProjW * 0.9, frontP.topRight.y - roofDepthY);
    ctx.lineTo(frontP.topRight.x, frontP.topRight.y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(230, 240, 255, 0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  return canvas;
}

/**
 * Renders a GameBoy-style classic grey retro cartridge.
 * Shape: Almost square (slightly taller than wide).
 * Features: Matte grey plastic shell with 3D depth, top thumb scoop, grip ridges,
 * recessed sticker pocket with glossy game artwork label, and embossed down-arrow.
 */
export function renderCartridgeGB(
  img: HTMLImageElement,
  options: Cover3dOptions = {}
): HTMLCanvasElement {
  const {
    outputWidth = 650,
    outputHeight = 650,
    direction = 'left',
    glossOpacity = 0.28,
    shadowOpacity = 0.48,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Proportions: classic GB cartridge is ~56mm wide x 65mm tall (approx 1 : 1.15)
  const cartW = Math.min(410, outputWidth * 0.66);
  const cartH = cartW * 1.15;
  const cartX = (outputWidth - cartW) / 2 - 4;
  const cartY = (outputHeight - cartH) / 2 - 6;

  const isLeft = direction === 'left';
  const depthX = isLeft ? 14 : -14;
  const depthY = -6;

  // 1. Floor Drop Shadow
  if (shadowOpacity > 0) {
    ctx.save();
    const shadowY = cartY + cartH + 16;
    const shadowGrad = ctx.createRadialGradient(
      outputWidth / 2,
      shadowY,
      10,
      outputWidth / 2,
      shadowY,
      cartW * 0.58
    );
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity * 0.95})`);
    shadowGrad.addColorStop(0.5, `rgba(0, 0, 0, ${shadowOpacity * 0.45})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(outputWidth / 2, shadowY, cartW * 0.58, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. 3D Plastic Thickness Edge (Side face)
  ctx.save();
  const sideX = isLeft ? cartX + cartW : cartX;
  const edgeX = sideX + depthX;
  ctx.fillStyle = '#8e939a';
  ctx.beginPath();
  ctx.moveTo(sideX, cartY + 14);
  ctx.lineTo(edgeX, cartY + 14 + depthY);
  ctx.lineTo(edgeX, cartY + cartH + depthY);
  ctx.lineTo(sideX, cartY + cartH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6e737a';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Top thickness edge
  ctx.fillStyle = '#a6abb2';
  ctx.beginPath();
  ctx.moveTo(cartX + 14, cartY);
  ctx.lineTo(cartX + 14 + (depthX > 0 ? depthX : 0), cartY + depthY);
  ctx.lineTo(cartX + cartW + (depthX > 0 ? depthX : 0), cartY + depthY);
  ctx.lineTo(cartX + cartW, cartY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 3. Cartridge Main Face (Matte warm retro grey)
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(cartX, cartY, cartX, cartY + cartH);
  bodyGrad.addColorStop(0, '#d2d6db');
  bodyGrad.addColorStop(0.15, '#c5c9cf');
  bodyGrad.addColorStop(0.85, '#b4b8be');
  bodyGrad.addColorStop(1, '#a4a8af');

  drawRoundedRect(ctx, cartX, cartY, cartW, cartH, { tl: 14, tr: 14, br: 6, bl: 6 });
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#8e939a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Iconic Top Thumb Scoop (Curved grip indent in top center)
  const scoopW = cartW * 0.54;
  const scoopH = 20;
  const scoopX = cartX + (cartW - scoopW) / 2;
  const scoopY = cartY + 6;

  const scoopGrad = ctx.createLinearGradient(scoopX, scoopY, scoopX, scoopY + scoopH);
  scoopGrad.addColorStop(0, '#8c9096');
  scoopGrad.addColorStop(0.7, '#a2a6ad');
  scoopGrad.addColorStop(1, '#c0c4cb');

  drawRoundedRect(ctx, scoopX, scoopY, scoopW, scoopH, { tl: 6, tr: 6, br: 10, bl: 10 });
  ctx.fillStyle = scoopGrad;
  ctx.fill();

  // Horizontal grip ribs inside thumb scoop
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  for (let rib = 0; rib < 3; rib++) {
    const ry = scoopY + 5 + rib * 4.5;
    ctx.beginPath();
    ctx.moveTo(scoopX + 10, ry);
    ctx.lineTo(scoopX + scoopW - 10, ry);
    ctx.stroke();
  }

  // 5. Upper Header Panel ("RETRO CARTRIDGE" embossed lettering strip)
  const headerY = cartY + 34;
  const headerH = 18;
  const headerW = cartW * 0.82;
  const headerX = cartX + (cartW - headerW) / 2;

  drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 6);
  ctx.fillStyle = '#b8bcc2';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText('• RETRO CARTRIDGE •', headerX + headerW / 2, headerY + headerH / 2 + 0.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillText('• RETRO CARTRIDGE •', headerX + headerW / 2, headerY + headerH / 2 - 0.5);

  // 6. Recessed Label Pocket (Sticker Well)
  const labelW = cartW * 0.80;
  const labelH = cartH * 0.65;
  const labelX = cartX + (cartW - labelW) / 2;
  const labelY = cartY + cartH * 0.22;

  ctx.save();
  drawRoundedRect(ctx, labelX - 2, labelY - 2, labelW + 4, labelH + 4, 10);
  ctx.fillStyle = '#8a8e94';
  ctx.fill();
  ctx.restore();

  // 7. Cover Artwork Sticker (strictly preserving natural aspect ratio - NO stretching!)
  drawCoverPreservingAspect(ctx, img, labelX, labelY, labelW, labelH, {
    cornerRadius: 8,
    ambientBackdrop: true,
    glossOpacity,
    platform: 'gb',
  });

  // 8. Embossed Insertion Arrow (▼ below the label)
  const arrowX = cartX + cartW / 2;
  const arrowY = labelY + labelH + 11;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(arrowX - 7, arrowY - 4);
  ctx.lineTo(arrowX + 7, arrowY - 4);
  ctx.lineTo(arrowX, arrowY + 5);
  ctx.closePath();
  ctx.fillStyle = '#9aa0a8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(arrowX - 7, arrowY - 4);
  ctx.lineTo(arrowX, arrowY + 5);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  return canvas;
}

/**
 * Renders a Mega Drive / Genesis-style classic black cartridge.
 * Shape: Distinctly wider than tall (aspect ~ 1.4 : 1).
 * Features: Charcoal-black plastic body with curved top, tactile lateral grip ribs,
 * central label recess with game artwork and glossy sticker sheen.
 */
export function renderCartridgeMD(
  img: HTMLImageElement,
  options: Cover3dOptions = {}
): HTMLCanvasElement {
  const {
    outputWidth = 650,
    outputHeight = 650,
    direction = 'left',
    glossOpacity = 0.30,
    shadowOpacity = 0.50,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Proportions: Wide cartridge (width >> height)
  const cartW = Math.min(520, outputWidth * 0.82);
  const cartH = cartW * 0.68;
  const cartX = (outputWidth - cartW) / 2 - 4;
  const cartY = (outputHeight - cartH) / 2 - 4;

  const isLeft = direction === 'left';
  const depthX = isLeft ? 14 : -14;
  const depthY = -6;

  // 1. Floor Drop Shadow
  if (shadowOpacity > 0) {
    ctx.save();
    const shadowY = cartY + cartH + 16;
    const shadowGrad = ctx.createRadialGradient(
      outputWidth / 2,
      shadowY,
      12,
      outputWidth / 2,
      shadowY,
      cartW * 0.58
    );
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
    shadowGrad.addColorStop(0.5, `rgba(0, 0, 0, ${shadowOpacity * 0.45})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(outputWidth / 2, shadowY, cartW * 0.58, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. 3D Plastic Side Edge
  ctx.save();
  const sideX = isLeft ? cartX + cartW : cartX;
  const edgeX = sideX + depthX;
  ctx.fillStyle = '#0d0e12';
  ctx.beginPath();
  ctx.moveTo(sideX, cartY + 24);
  ctx.lineTo(edgeX, cartY + 24 + depthY);
  ctx.lineTo(edgeX, cartY + cartH + depthY);
  ctx.lineTo(sideX, cartY + cartH);
  ctx.closePath();
  ctx.fill();

  // Top edge
  ctx.fillStyle = '#22242c';
  ctx.beginPath();
  ctx.moveTo(cartX + 26, cartY);
  ctx.lineTo(cartX + 26 + (depthX > 0 ? depthX : 0), cartY + depthY);
  ctx.lineTo(cartX + cartW + (depthX > 0 ? depthX : 0), cartY + depthY);
  ctx.lineTo(cartX + cartW, cartY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Main Cartridge Body (Matte black/charcoal plastic with rounded top corners)
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(cartX, cartY, cartX, cartY + cartH);
  bodyGrad.addColorStop(0, '#2b2d36');
  bodyGrad.addColorStop(0.15, '#1e2027');
  bodyGrad.addColorStop(0.85, '#16171d');
  bodyGrad.addColorStop(1, '#0e0f13');

  drawRoundedRect(ctx, cartX, cartY, cartW, cartH, { tl: 28, tr: 28, br: 8, bl: 8 });
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#363944';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top highlight arc
  const arcGrad = ctx.createLinearGradient(cartX + 28, cartY, cartX + cartW - 28, cartY);
  arcGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  arcGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
  arcGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.strokeStyle = arcGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cartX + 28, cartY + 1);
  ctx.lineTo(cartX + cartW - 28, cartY + 1);
  ctx.stroke();

  // 4. Iconic Lateral Grip Ribs (Left & Right ribbed slats)
  const numRibs = 5;
  const ribW = 22;
  const ribH = 4;
  const ribGap = 8;
  const startRibY = cartY + cartH * 0.32;

  ctx.save();
  for (let i = 0; i < numRibs; i++) {
    const ry = startRibY + i * (ribH + ribGap);

    // Left ribs
    ctx.fillStyle = '#0b0c0f';
    ctx.fillRect(cartX + 8, ry, ribW, ribH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(cartX + 8, ry + ribH, ribW, 1);

    // Right ribs
    ctx.fillStyle = '#0b0c0f';
    ctx.fillRect(cartX + cartW - ribW - 8, ry, ribW, ribH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(cartX + cartW - ribW - 8, ry + ribH, ribW, 1);
  }
  ctx.restore();

  // 5. Central Label Recess (Sticker Well)
  const labelW = cartW * 0.62;
  const labelH = cartH * 0.80;
  const labelX = cartX + (cartW - labelW) / 2;
  const labelY = cartY + (cartH - labelH) / 2 + 2;

  drawRoundedRect(ctx, labelX - 2, labelY - 2, labelW + 4, labelH + 4, 10);
  ctx.fillStyle = '#090a0d';
  ctx.fill();

  // 6. Cover Artwork Label (strictly preserving natural aspect ratio - NO stretching!)
  drawCoverPreservingAspect(ctx, img, labelX, labelY, labelW, labelH, {
    cornerRadius: 8,
    ambientBackdrop: true,
    glossOpacity,
    platform: 'md',
  });

  // 7. Bottom stepped lip
  ctx.fillStyle = '#121318';
  ctx.fillRect(cartX + 24, cartY + cartH - 6, cartW - 48, 6);

  ctx.restore();
  return canvas;
}

/**
 * Renders a SNES-style classic wide grey cartridge.
 * Shape: Wide format with top groove, side lock indents, and wide central label.
 */
export function renderCartridgeSNES(
  img: HTMLImageElement,
  options: Cover3dOptions = {}
): HTMLCanvasElement {
  const {
    outputWidth = 650,
    outputHeight = 650,
    direction = 'left',
    glossOpacity = 0.26,
    shadowOpacity = 0.46,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cartW = Math.min(520, outputWidth * 0.82);
  const cartH = cartW * 0.65;
  const cartX = (outputWidth - cartW) / 2 - 4;
  const cartY = (outputHeight - cartH) / 2 - 4;

  const isLeft = direction === 'left';
  const depthX = isLeft ? 14 : -14;
  const depthY = -6;

  // 1. Drop shadow
  if (shadowOpacity > 0) {
    ctx.save();
    const shadowY = cartY + cartH + 16;
    const shadowGrad = ctx.createRadialGradient(
      outputWidth / 2,
      shadowY,
      12,
      outputWidth / 2,
      shadowY,
      cartW * 0.58
    );
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
    shadowGrad.addColorStop(0.5, `rgba(0, 0, 0, ${shadowOpacity * 0.45})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(outputWidth / 2, shadowY, cartW * 0.58, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. 3D Side depth
  ctx.save();
  const sideX = isLeft ? cartX + cartW : cartX;
  const edgeX = sideX + depthX;
  ctx.fillStyle = '#8a8e95';
  ctx.beginPath();
  ctx.moveTo(sideX, cartY + 14);
  ctx.lineTo(edgeX, cartY + 14 + depthY);
  ctx.lineTo(edgeX, cartY + cartH + depthY);
  ctx.lineTo(sideX, cartY + cartH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#a6abb3';
  ctx.beginPath();
  ctx.moveTo(cartX + 14, cartY);
  ctx.lineTo(cartX + 14 + (depthX > 0 ? depthX : 0), cartY + depthY);
  ctx.lineTo(cartX + cartW + (depthX > 0 ? depthX : 0), cartY + depthY);
  ctx.lineTo(cartX + cartW, cartY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Main SNES Grey Body
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(cartX, cartY, cartX, cartY + cartH);
  bodyGrad.addColorStop(0, '#d8dbe0');
  bodyGrad.addColorStop(0.2, '#cbcfd5');
  bodyGrad.addColorStop(0.85, '#bac0c7');
  bodyGrad.addColorStop(1, '#a8aeb6');

  drawRoundedRect(ctx, cartX, cartY, cartW, cartH, 12);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#8a8f96';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Side locking notches
  ctx.fillStyle = '#7a7e85';
  ctx.fillRect(cartX, cartY + cartH * 0.5, 6, 24);
  ctx.fillRect(cartX + cartW - 6, cartY + cartH * 0.5, 6, 24);

  // 4. Central Label
  const labelW = cartW * 0.72;
  const labelH = cartH * 0.74;
  const labelX = cartX + (cartW - labelW) / 2;
  const labelY = cartY + (cartH - labelH) / 2;

  drawRoundedRect(ctx, labelX - 2, labelY - 2, labelW + 4, labelH + 4, 8);
  ctx.fillStyle = '#82878e';
  ctx.fill();

  // 5. Cover Artwork Label (strictly preserving natural aspect ratio - NO stretching!)
  drawCoverPreservingAspect(ctx, img, labelX, labelY, labelW, labelH, {
    cornerRadius: 6,
    ambientBackdrop: true,
    glossOpacity,
    platform: 'snes',
  });

  ctx.restore();
  return canvas;
}

/**
 * Converts a Canvas to a Blob (image/png).
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas to Blob conversion failed'));
    }, 'image/png');
  });
}

/**
 * Downscales an image preserving exact aspect ratio and outputs strictly as PNG.
 * Skips scaling if original is already within maxDimension.
 */
export async function downscaleImageToPng(
  img: HTMLImageElement | File | Blob | HTMLCanvasElement,
  maxDimension: number = 600
): Promise<{ blob: Blob; width: number; height: number; scaled: boolean }> {
  let htmlImg: HTMLImageElement;
  let shouldRevoke = false;
  let objectUrl = '';

  if (img instanceof HTMLImageElement) {
    htmlImg = img;
  } else if (img instanceof HTMLCanvasElement) {
    const blob = await canvasToBlob(img);
    objectUrl = URL.createObjectURL(blob);
    shouldRevoke = true;
    htmlImg = await loadImageFromUrl(objectUrl);
  } else {
    objectUrl = URL.createObjectURL(img);
    shouldRevoke = true;
    htmlImg = await loadImageFromUrl(objectUrl);
  }

  const origW = htmlImg.naturalWidth || htmlImg.width;
  const origH = htmlImg.naturalHeight || htmlImg.height;

  // Calculate scaled dimensions preserving aspect ratio
  let targetW = origW;
  let targetH = origH;
  let scaled = false;

  const maxSide = Math.max(origW, origH);
  if (maxSide > maxDimension) {
    const ratio = maxDimension / maxSide;
    targetW = Math.max(1, Math.round(origW * ratio));
    targetH = Math.max(1, Math.round(origH * ratio));
    scaled = true;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D-Kontext nicht verfügbar');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(htmlImg, 0, 0, targetW, targetH);

  if (shouldRevoke && objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }

  const blob = await canvasToBlob(canvas);
  return { blob, width: targetW, height: targetH, scaled };
}
