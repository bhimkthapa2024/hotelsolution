'use client';

import { useEffect } from 'react';

export default function UIThemeProvider({ display }: { display: any }) {
  useEffect(() => {
    if (!display) return;

    const root = document.documentElement;
    
    // 1. Primary Palette Logic
    if (display.primaryColor) {
      root.style.setProperty('--primary-color', display.primaryColor);
      root.style.setProperty('--primary-glow', `${display.primaryColor}33`);
    }

    // 2. Typographic Scaling Registry
    if (display.fontSize) {
      const val = typeof display.fontSize === 'number' || !isNaN(Number(display.fontSize)) ? `${display.fontSize}px` : display.fontSize;
      root.style.setProperty('--base-font-size', val);
    }
    if (display.fontFamily) {
      root.style.setProperty('--font-main', display.fontFamily);
    }
    if (display.textColor) {
      root.style.setProperty('--text-main', display.textColor);
    }
    if (display.tracking !== undefined) {
      const val = typeof display.tracking === 'number' || !isNaN(Number(display.tracking)) ? `${display.tracking}em` : display.tracking;
      root.style.setProperty('--tracking-main', val);
    }

    // 3. Geometric Curvature Architecture
    if (display.radius !== undefined) {
      const radiusNum = parseFloat(display.radius);
      const val = typeof display.radius === 'number' || !isNaN(Number(display.radius)) ? `${display.radius}px` : display.radius;
      root.style.setProperty('--radius-main', val);
      root.style.setProperty('--radius-sm', `${radiusNum * 0.4}px`);
      root.style.setProperty('--radius-md', `${radiusNum * 0.7}px`);
      root.style.setProperty('--radius-lg', `${radiusNum}px`);
    }

    // 4. Industrial Layout Metrics
    if (display.sidebarWidth !== undefined) {
      root.style.setProperty('--sidebar-width', `${display.sidebarWidth}px`);
    }
    if (display.density !== undefined) {
      root.style.setProperty('--density-scale', display.density.toString());
    }

    // 5. Visual Fidelity (Shadows & Texture)
    if (display.shadowDepth !== undefined) {
      const depth = display.shadowDepth; // 0 to 1
      root.style.setProperty('--shadow-main', `0 ${depth*10}px ${depth*30}px rgba(0,0,0,${depth*0.15})`);
      root.style.setProperty('--shadow-sm', `0 ${depth*2}px ${depth*8}px rgba(0,0,0,${depth*0.08})`);
    }

    // Canvas Texture Logic
    if (display.canvasTexture) {
      let texture = 'none';
      if (display.canvasTexture === 'GRAIN') texture = 'url("https://www.transparenttextures.com/patterns/stardust.png")';
      if (display.canvasTexture === 'GRID') texture = 'url("https://www.transparenttextures.com/patterns/subtle-grey-dots.png")';
      root.style.setProperty('--canvas-texture', texture);
    }

    // 6. Motion Velocity
    if (display.motionSpeed !== undefined) {
      root.style.setProperty('--motion-duration', `${display.motionSpeed}s`);
    }

    // 7. Interactive Scaling
    if (display.hoverScale !== undefined) {
       root.style.setProperty('--hover-scale-factor', (1 + (display.hoverScale * 0.05)).toString());
    }

  }, [display]);

  return (
    <style 
      precedence="default" 
      href="hotel-ui-theme"
      dangerouslySetInnerHTML={{ __html: `
      :root {
        --primary-color: ${display?.primaryColor || '#4f46e5'};
        --text-main: ${display?.textColor || '#0f172a'};
        --bg-color: ${display?.bgColor || '#f8fafc'};
        --base-font-size: ${display?.fontSize || '16'}${ (typeof display?.fontSize === 'number' || !isNaN(Number(display?.fontSize))) ? 'px' : '' };
        --font-main: ${display?.fontFamily || '"Outfit", "Inter", sans-serif'};
        --radius-main: ${display?.radius !== undefined ? display.radius : 16}${ (typeof display?.radius === 'number' || !isNaN(Number(display?.radius))) ? 'px' : '' };
        --tracking-main: ${display?.tracking !== undefined ? display.tracking : '0'}${ (typeof display?.tracking === 'number' || !isNaN(Number(display?.tracking))) ? 'em' : '' };
        --density-scale: ${display?.density !== undefined ? display.density : '1.0'};
        --internal-padding: ${display?.internalPadding !== undefined ? display.internalPadding : '1.0'};
        --sidebar-width: ${display?.sidebarWidth || '260'}px;
        --motion-duration: ${display?.motionSpeed !== undefined ? display.motionSpeed : '0.4'}s;
        --canvas-texture: none;
        --hover-scale-factor: ${ 1 + ( (display?.hoverScale || 0.5) * 0.05 ) };
        
        --radius-sm: ${ parseFloat(display?.radius || 16) * 0.4 }px;
        --radius-md: ${ parseFloat(display?.radius || 16) * 0.7 }px;
        --radius-lg: ${ parseFloat(display?.radius || 16) }px;

        --shadow-main: 0 ${ (display?.shadowDepth || 0.7) * 10 }px ${ (display?.shadowDepth || 0.7) * 30 }px rgba(0,0,0,${ (display?.shadowDepth || 0.7) * 0.15 });
        --shadow-sm: 0 ${ (display?.shadowDepth || 0.7) * 2 }px ${ (display?.shadowDepth || 0.7) * 8 }px rgba(0,0,0,${ (display?.shadowDepth || 0.7) * 0.08 });

        --header-blur: ${ display?.glassEffect !== false ? 'blur(16px)' : 'none' };
        --header-bg: ${ display?.glassEffect !== false ? 'rgba(255,255,255,0.8)' : '#ffffff' };
      }
      
      html {
        font-size: var(--base-font-size);
      }
      
      body {
        font-family: var(--font-main);
        letter-spacing: var(--tracking-main);
        line-height: calc(1.6 / var(--density-scale));
        transition: background-color var(--motion-duration) ease;
        background-image: var(--canvas-texture);
      }
      
      .rounded-lg, .rounded-\\[var\\(--radius-lg\\)\\] { border-radius: var(--radius-lg) !important; }
      .rounded-md, .rounded-\\[var\\(--radius-md\\)\\] { border-radius: var(--radius-md) !important; }
      .rounded-sm, .rounded-\\[var\\(--radius-sm\\)\\] { border-radius: var(--radius-sm) !important; }

      .shadow-sm, .shadow-md, .shadow-xl, .shadow-2xl { box-shadow: var(--shadow-main) !important; }
      
      /* Row-Specific Vertical Scaling */
      .py-1 { padding-top: calc(0.25rem * var(--density-scale)) !important; padding-bottom: calc(0.25rem * var(--density-scale)) !important; }
      .py-2 { padding-top: calc(0.5rem * var(--density-scale)) !important; padding-bottom: calc(0.5rem * var(--density-scale)) !important; }
      .py-2\.5 { padding-top: calc(0.625rem * var(--density-scale)) !important; padding-bottom: calc(0.625rem * var(--density-scale)) !important; }
      .py-3 { padding-top: calc(0.75rem * var(--density-scale)) !important; padding-bottom: calc(0.75rem * var(--density-scale)) !important; }
      .py-3\.5 { padding-top: calc(0.875rem * var(--density-scale)) !important; padding-bottom: calc(0.875rem * var(--density-scale)) !important; }
      .py-4 { padding-top: calc(1rem * var(--density-scale)) !important; padding-bottom: calc(1rem * var(--density-scale)) !important; }
      .py-5 { padding-top: calc(1.25rem * var(--density-scale)) !important; padding-bottom: calc(1.25rem * var(--density-scale)) !important; }
      .py-6 { padding-top: calc(1.5rem * var(--density-scale)) !important; padding-bottom: calc(1.5rem * var(--density-scale)) !important; }

      /* Global Component Internal Padding Scaling */
      .p-2, .p-2\.5 { padding: calc(0.5rem * var(--internal-padding)) !important; }
      .p-4 { padding: calc(1rem * var(--internal-padding)) !important; }
      .p-5 { padding: calc(1.25rem * var(--internal-padding)) !important; }
      .p-6 { padding: calc(1.5rem * var(--internal-padding)) !important; }
      .p-8 { padding: calc(2rem * var(--internal-padding)) !important; }
      .p-10 { padding: calc(2.5rem * var(--internal-padding)) !important; }
      
      .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
      .px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }

      .mb-8 { margin-bottom: calc(2rem * var(--internal-padding)) !important; }
      .mb-10 { margin-bottom: calc(2.5rem * var(--internal-padding)) !important; }
      .mb-12 { margin-bottom: calc(3rem * var(--internal-padding)) !important; }

      /* Institutional Interactive Smoothing */
      .group:hover, .hover-scale:hover {
        transform: scale(var(--hover-scale-factor));
        transition: transform var(--motion-duration) cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
    `}} />
  );
}
