import { getListDataGroupAll } from "@/app/actions/dashboard"
import { GroupDashboardClient } from "./client"

export default async function Page() {
    const groups = await getListDataGroupAll()
    const defaultGroupCode = process.env.GROUP_CODE_All_PROJECT

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <GroupDashboardClient groups={groups} defaultGroupCode={defaultGroupCode} />
        </div>
    )
}
