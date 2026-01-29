import { getPersonalList } from "@/app/actions/personal"
import { PersonalClient } from "./client"

export default async function PersonalPage() {
    const data = await getPersonalList()
    const personalList = data?.dataReturn || []
    const roleList = data?.roleList || []

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <PersonalClient initialData={personalList} roles={roleList} />
        </div>
    )
}
