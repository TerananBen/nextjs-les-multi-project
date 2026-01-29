import { StreetLightClient } from "./client"

export default function Page() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <StreetLightClient />
        </div>
    )
}
