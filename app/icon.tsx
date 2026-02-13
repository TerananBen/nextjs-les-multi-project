import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 16, // Increased slightly for sharpness
                    background: 'linear-gradient(to bottom, #0056b3, #004494)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '6px',
                    border: '2px solid #e0e0e0', // Silver border
                    fontWeight: 900,
                    fontFamily: 'sans-serif',
                    lineHeight: 1,
                    paddingTop: '0px',
                    // No text stroke for sharpness
                }}
            >
                L&amp;E
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    )
}
