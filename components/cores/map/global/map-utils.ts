/**
 * Checks if the GPS coordinates are valid.
 * Returns false for "LES", "RES", null, undefined, empty string, or non-numeric values.
 * Returns true only if both lat and lng are valid numbers.
 */
export function isValidGPS(lat: string, lng: string): boolean {
    if (!lat || !lng) return false;

    // Check for specific tokens if needed, but parseFloat handles non-numeric strings returning NaN
    if (lat === "LES" || lng === "LES" || lat === "RES" || lng === "RES") return false;

    const l = parseFloat(lat);
    const g = parseFloat(lng);

    // Ensure both are valid numbers and at least one is non-zero (assuming 0,0 is invalid/default)
    return !isNaN(l) && !isNaN(g) && (l !== 0 || g !== 0);
}
