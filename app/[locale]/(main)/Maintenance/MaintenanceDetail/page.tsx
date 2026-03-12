import { getDataListMaintenanceDetail } from "@/app/actions/maintenance"
import { MaintenanceDetailClient } from "./client"

export default async function MaintenanceDetailPage() {
    const data = await getDataListMaintenanceDetail()

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <MaintenanceDetailClient initialData={data || []} />
        </div>
    )
}
