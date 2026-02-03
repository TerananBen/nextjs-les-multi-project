export type MarkerColor = 'green' | 'gray' | 'red' | 'blue' | 'yellow' | 'orange';
export type MarkerBadge = 'A' | 'M' | 'E' | '⚡' | 'X' | null;

const COLORS = {
    green: '#22c55e',
    gray: '#6b7280',
    red: '#ef4444',
    blue: '#3b82f6',
    yellow: '#eab308',
    orange: '#f97316',
    white: '#ffffff',
    black: '#000000'
};

export function getSvgMarker(colorName: MarkerColor, badge: MarkerBadge): string {
    const color = COLORS[colorName];

    // Lightbulb Shape
    const svg = `
  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
        <!-- Screw Base (Gray/Dark) -->
        <path d="M16 30 L24 30 L23 35 C23 36 22 37 20 37 C18 37 17 36 17 35 Z" fill="#555" stroke="none" />
        <rect x="16" y="30" width="8" height="2" fill="#333" />
        <rect x="16.5" y="32" width="7" height="1" fill="#777" />
        <rect x="17" y="34" width="6" height="1" fill="#777" />

        <!-- Bulb Body -->
        <path d="M20 3 C12.8 3 7 8.8 7 16 C7 21 11 25.5 14 28 L26 28 C29 25.5 33 21 33 16 C33 8.8 27.2 3 20 3 Z" fill="${color}" stroke="white" stroke-width="1.5"/>

        <!-- Shine/Reflection -->
        <path d="M13 10 C13 10 15 8 18 8" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4"/>

      ${badge ? `
      <!-- Badge Text (Inside Bulb) -->
      <text x="20" y="21" font-family="Arial, sans-serif" font-weight="900" font-size="14" text-anchor="middle" fill="white" style="text-shadow: 0px 1px 2px rgba(0,0,0,0.3);">${badge}</text>
      ` : ''}
    </g>
  </svg>`;

    return svg.trim();
}

export function getLeafletIconUrl(color: MarkerColor, badge: MarkerBadge): string {
    const svg = getSvgMarker(color, badge);
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getGoogleMapsIconHtml(color: MarkerColor, badge: MarkerBadge): string {
    const svg = getSvgMarker(color, badge);
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
