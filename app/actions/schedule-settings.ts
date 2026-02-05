"use server"

import { cookies } from "next/headers"
import { ScheduleResponse, ScheduleItem } from "@/types/schedule-settings"

const API_URL = process.env.API_URL

export async function getDataScheduleAction(): Promise<ScheduleItem[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        console.error("API_URL or token missing")
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataScheduleMultiSensor`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return []
        }

        const data: ScheduleResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching schedule data:", error)
        return []
    }
}
