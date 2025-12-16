import { getPersonalList } from "@/app/actions/personal"
import { PersonalClient } from "./client"

export default async function PersonalPage() {
    const data = await getPersonalList()
    const personalList = data?.dataReturn || []
    const roleList = data?.roleList || []

    return (
        <div className="flex flex-col gap-4 p-4 md:p-8">
            <PersonalClient initialData={personalList} roles={roleList} />
        </div>
    )
}
