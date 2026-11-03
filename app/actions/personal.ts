"use server"

import { cookies } from "next/headers"

import { fetchNestJs } from "@/lib/nestjs"
import { getKeycloakRolesAction, getRealmRolesAction } from "@/app/actions/menu-settings"
import { getProjectsList } from "@/app/actions/project-management"
import { getProjectById, resolveProjectUuid } from "@/config/projects"
import { decodeJwtPayload, refreshKeycloakToken, isKeycloakConfigured } from "@/lib/keycloak"

const API_URL = process.env.API_URL

function isKeycloakSession(token?: string): boolean {
    if (!token) return false
    const payload = decodeJwtPayload(token)
    return Boolean(payload?.sub) || isKeycloakConfigured()
}

interface NestUserResponse {
    id: string
    username: string
    firstName?: string
    lastName?: string
    email?: string
    enabled: boolean
    roleId?: string
    roleName?: string
    projectIds?: string[]
    projectRoles?: {
        projectId: string
        projectName?: string
        roleId: string
        roleName: string
    }[]
    createdTimestamp?: string
    lastLogin?: string
}

export interface PersonalProjectRole {
    project_id: string
    project_name?: string
    role_id: string
    role_name?: string
}

export interface PersonalItem {
    personal_id: string
    project_id: string
    roles_id: string
    personal_username: string
    first_name: string
    last_name: string
    personal_password: string | null
    last_token: string
    projectName: string
    roleName: string
    last_login: string
    usable: string | null
    email?: string
    personal_email?: string
    project_ids?: string[]
    project_roles?: PersonalProjectRole[]
}

export interface RoleItem {
    [key: string]: string
}

export interface PersonalListResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: PersonalItem[]
    roleList: RoleItem[]
}

export interface PersonalDetailResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: PersonalItem
}

export async function getPersonalList(projectIdOverride?: string): Promise<PersonalListResponse | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const activeProjectId = projectIdOverride === "ALL" ? undefined : (projectIdOverride || cookieStore.get("current_project")?.value)

    // 1. Fetch from NestJS (Keycloak Realm les) if token is present
    if (token) {
        try {
            const usersUrl = projectIdOverride === "ALL" ? "/api/users?project_id=ALL" : "/api/users"
            const [users, keycloakRoles, realmRoles, projects] = await Promise.all([
                fetchNestJs<NestUserResponse[]>(usersUrl),
                getKeycloakRolesAction(),
                getRealmRolesAction(),
                getProjectsList(),
            ])

            if (users && Array.isArray(users)) {
                const projectMap = new Map<string, string>()
                projects.forEach((p) => {
                    projectMap.set(p.id, p.name)
                    if (p.uuid) projectMap.set(p.uuid, p.name)
                    if (p.code) projectMap.set(p.code, p.name)
                })

                const roleMap = new Map<string, string>()
                realmRoles.forEach((r) => roleMap.set(r.id, r.name))
                keycloakRoles.forEach((r) => roleMap.set(r.id, r.name))

                const roleList: RoleItem[] = Array.from(roleMap.entries()).map(([id, name]) => ({
                    [id]: name,
                }))

                const dataReturn: PersonalItem[] = users.map((u) => {
                    const mappedProjectRoles: PersonalProjectRole[] = (u.projectRoles || []).map((pr) => {
                        const resolvedPid = resolveProjectUuid(pr.projectId) || pr.projectId
                        const pName = projectMap.get(resolvedPid) || projectMap.get(pr.projectId) || pr.projectName || resolvedPid
                        return {
                            project_id: resolvedPid,
                            project_name: pName,
                            role_id: pr.roleId,
                            role_name: pr.roleName,
                        }
                    })

                    const roleProjectIds = mappedProjectRoles.map((pr) => pr.project_id)
                    const normalizedProjectIds = Array.from(
                        new Set([
                            ...(u.projectIds || [])
                                .map((pid) => resolveProjectUuid(pid))
                                .filter((id): id is string => Boolean(id)),
                            ...roleProjectIds,
                        ])
                    )
                    const primaryProjectId = normalizedProjectIds[0] || resolveProjectUuid(u.projectIds?.[0]) || ""
                    const projectName = projectMap.get(primaryProjectId) || projectMap.get(resolveProjectUuid(primaryProjectId)) || primaryProjectId
                    const primaryRoleId = mappedProjectRoles[0]?.role_id || u.roleId || ""
                    const primaryRoleName = mappedProjectRoles[0]?.role_name || u.roleName || ""

                    return {
                        personal_id: u.id,
                        project_id: primaryProjectId,
                        roles_id: primaryRoleId,
                        personal_username: u.username,
                        first_name: u.firstName || "",
                        last_name: u.lastName || "",
                        personal_password: null,
                        last_token: "",
                        projectName,
                        roleName: primaryRoleName,
                        last_login: u.lastLogin || "-",
                        usable: u.enabled ? "Y" : "N",
                        email: u.email || "",
                        personal_email: u.email || "",
                        project_ids: normalizedProjectIds,
                        project_roles: mappedProjectRoles,
                    }
                })

                return {
                    result: true,
                    apiName: "NestJS /api/users",
                    dateTime: new Date().toISOString(),
                    dataReturn,
                    roleList,
                }
            }
        } catch (error) {
            console.error("Error fetching Keycloak users from NestJS:", error)
        }
    }

    // 2. Fallback to legacy API
    if (!token || !API_URL) return null

    if (isKeycloakSession(token)) {
        return {
            result: false,
            apiName: "NestJS /api/users",
            dateTime: new Date().toISOString(),
            dataReturn: [],
            roleList: [],
        }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataListPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}),
        })

        if (!response.ok) {
            console.error("Response not ok:", await response.text())
            return null
        }
        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error fetching personal list:", error)
        return null
    }
}

export async function getPersonalDetail(personal_id: string): Promise<PersonalDetailResponse | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (token) {
        try {
            const u = await fetchNestJs<NestUserResponse>(`/api/users/${encodeURIComponent(personal_id)}`)
            if (u && u.id) {
                const projects = await getProjectsList()
                const projectMap = new Map<string, string>()
                projects.forEach((p) => {
                    projectMap.set(p.id, p.name)
                    if (p.uuid) projectMap.set(p.uuid, p.name)
                    if (p.code) projectMap.set(p.code, p.name)
                })
                const mappedProjectRoles: PersonalProjectRole[] = (u.projectRoles || []).map((pr) => {
                    const resolvedPid = resolveProjectUuid(pr.projectId) || pr.projectId
                    const pName = projectMap.get(resolvedPid) || projectMap.get(pr.projectId) || pr.projectName || resolvedPid
                    return {
                        project_id: resolvedPid,
                        project_name: pName,
                        role_id: pr.roleId,
                        role_name: pr.roleName,
                    }
                })

                const roleProjectIds = mappedProjectRoles.map((pr) => pr.project_id)
                const normalizedProjectIds = Array.from(
                    new Set([
                        ...(u.projectIds || [])
                            .map((pid) => resolveProjectUuid(pid))
                            .filter((id): id is string => Boolean(id)),
                        ...roleProjectIds,
                    ])
                )
                const primaryProjectId = normalizedProjectIds[0] || resolveProjectUuid(u.projectIds?.[0]) || ""
                const projectName = projectMap.get(primaryProjectId) || projectMap.get(resolveProjectUuid(primaryProjectId)) || primaryProjectId
                const primaryRoleId = mappedProjectRoles[0]?.role_id || u.roleId || ""
                const primaryRoleName = mappedProjectRoles[0]?.role_name || u.roleName || ""

                return {
                    result: true,
                    apiName: "NestJS /api/users/:id",
                    dateTime: new Date().toISOString(),
                    dataReturn: {
                        personal_id: u.id,
                        project_id: primaryProjectId,
                        roles_id: primaryRoleId,
                        personal_username: u.username,
                        first_name: u.firstName || "",
                        last_name: u.lastName || "",
                        personal_password: null,
                        last_token: "",
                        projectName,
                        roleName: primaryRoleName,
                        last_login: u.lastLogin || "-",
                        usable: u.enabled ? "Y" : "N",
                        email: u.email || "",
                        personal_email: u.email || "",
                        project_ids: normalizedProjectIds,
                        project_roles: mappedProjectRoles,
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching user detail from NestJS:", error)
        }
    }

    if (!API_URL || !token || isKeycloakSession(token)) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_id }),
        })

        if (!response.ok) return null
        return await response.json()
    } catch (error) {
        console.error("Error fetching personal detail:", error)
        return null
    }
}

export interface SavePersonalParams {
    personal_id?: string
    personal_firstname: string
    personal_lastname: string
    personal_username: string
    personal_email?: string
    email?: string
    personal_password: string | null
    cmb_role?: string
    project_id?: string
    project_ids?: string[]
    project_roles?: { project_id: string; role_id: string }[]
    actionData: "ADD" | "EDIT"
}

export async function savePersonal(data: SavePersonalParams): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    // 1. Save in NestJS (Keycloak)
    if (token) {
        try {
            if (data.actionData === "ADD") {
                const payload: Record<string, unknown> = {
                    username: data.personal_username,
                    firstName: data.personal_firstname,
                    lastName: data.personal_lastname,
                    email: data.personal_email || data.email || "",
                    password: data.personal_password || "",
                    enabled: true,
                }

                const projects = await getProjectsList()
                const projectMap: Record<string, string> = {}

                const isSuperAdminRole =
                    (data.cmb_role || "").toLowerCase().includes("superadmin") ||
                    data.cmb_role === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca";

                if (isSuperAdminRole) {
                    payload.roleId = data.cmb_role || "";
                    payload.projectRoles = [];
                    payload.projectIds = [];
                    payload.project = {};
                } else if (data.project_roles && data.project_roles.length > 0) {
                    payload.projectRoles = data.project_roles.map((pr) => ({
                        projectId: pr.project_id,
                        roleId: pr.role_id,
                    }))
                    payload.projectIds = data.project_roles.map((pr) => pr.project_id)
                    payload.roleId = data.project_roles[0].role_id

                    data.project_roles.forEach((pr) => {
                        const found = projects.find((p) => p.id === pr.project_id || p.uuid === pr.project_id || p.code === pr.project_id)
                        const pCode = found?.code || found?.id || pr.project_id
                        const pId = found?.uuid || found?.id || pr.project_id
                        projectMap[pCode] = pId
                    })
                    payload.project = projectMap
                } else {
                    payload.roleId = data.cmb_role || ""
                    payload.projectRoles = []
                    payload.projectIds = data.project_ids || (data.project_id ? [data.project_id] : [])

                    const pIds = payload.projectIds as string[]
                    pIds.forEach((pid) => {
                        const found = projects.find((p) => p.id === pid || p.uuid === pid || p.code === pid)
                        const pCode = found?.code || found?.id || pid
                        const pId = found?.uuid || found?.id || pid
                        projectMap[pCode] = pId
                    })
                    payload.project = projectMap
                }

                const nestRes = await fetchNestJs<{ success?: boolean; id?: string }>("/api/users", {
                    method: "POST",
                    body: JSON.stringify(payload),
                })
                if (nestRes && nestRes.success) {
                    return { result: true, message: "User created successfully" }
                }
            } else {
                const payload: Record<string, unknown> = {
                    firstName: data.personal_firstname,
                    lastName: data.personal_lastname,
                    email: data.personal_email || data.email || "",
                    password: data.personal_password || undefined,
                }

                const projects = await getProjectsList()
                const projectMap: Record<string, string> = {}

                const isSuperAdminRole =
                    (data.cmb_role || "").toLowerCase().includes("superadmin") ||
                    data.cmb_role === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca";

                if (isSuperAdminRole) {
                    payload.roleId = data.cmb_role || undefined;
                    payload.projectRoles = [];
                    payload.projectIds = [];
                    payload.project = {};
                } else if (data.project_roles !== undefined && data.project_roles.length > 0) {
                    payload.projectRoles = data.project_roles.map((pr) => ({
                        projectId: pr.project_id,
                        roleId: pr.role_id,
                    }))
                    payload.projectIds = data.project_roles.map((pr) => pr.project_id)
                    payload.roleId = data.project_roles[0].role_id

                    data.project_roles.forEach((pr) => {
                        const found = projects.find((p) => p.id === pr.project_id || p.uuid === pr.project_id || p.code === pr.project_id)
                        const pCode = found?.code || found?.id || pr.project_id
                        const pId = found?.uuid || found?.id || pr.project_id
                        projectMap[pCode] = pId
                    })
                    payload.project = projectMap
                } else {
                    payload.roleId = data.cmb_role || undefined
                    payload.projectRoles = []
                    payload.projectIds = data.project_ids || (data.project_id ? [data.project_id] : undefined)

                    const pIds = (payload.projectIds || []) as string[]
                    pIds.forEach((pid) => {
                        const found = projects.find((p) => p.id === pid || p.uuid === pid || p.code === pid)
                        const pCode = found?.code || found?.id || pid
                        const pId = found?.uuid || found?.id || pid
                        projectMap[pCode] = pId
                    })
                    payload.project = projectMap
                }

                const targetId = data.personal_id || ""
                const nestRes = await fetchNestJs<{ success?: boolean }>(`/api/users/${encodeURIComponent(targetId)}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                })
                if (nestRes && nestRes.success) {
                    return { result: true, message: "User updated successfully" }
                }
            }
        } catch (error) {
            console.error("Error saving user to NestJS:", error)
        }
    }

    // 2. Fallback to legacy API
    if (isKeycloakSession(token)) return { result: false, message: "NestJS service error or unavailable" }
    if (!API_URL || !token) return { result: false, message: "API URL not configured" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/saveDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        })

        return await response.json()
    } catch (error) {
        console.error("Error saving personal:", error)
        return { result: false, message: "Network error" }
    }
}

export async function setPersonalUsable(personal_id: string, status: "Y" | "N"): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    // 1. Update in NestJS (Keycloak)
    if (token) {
        try {
            const nestRes = await fetchNestJs<{ success?: boolean }>(`/api/users/${encodeURIComponent(personal_id)}/status`, {
                method: "PATCH",
                body: JSON.stringify({ enabled: status === "Y" }),
            })
            if (nestRes && nestRes.success) {
                return { result: true }
            }
        } catch (error) {
            console.error("Error setting personal status in NestJS:", error)
        }
    }

    // 2. Fallback to legacy API
    if (isKeycloakSession(token)) return { result: false, message: "NestJS service error or unavailable" }
    if (!API_URL || !token) return { result: false, message: "API URL not configured" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/setUsablePersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_id, status }),
        })

        return await response.json()
    } catch (error) {
        console.error("Error setting personal usable:", error)
        return { result: false, message: "Network error" }
    }
}

export async function deletePersonal(personal_id: string): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    // 1. Delete in NestJS (Keycloak)
    if (token) {
        try {
            const nestRes = await fetchNestJs<{ success?: boolean }>(`/api/users/${encodeURIComponent(personal_id)}`, {
                method: "DELETE",
            })
            if (nestRes && nestRes.success) {
                return { result: true }
            }
        } catch (error) {
            console.error("Error deleting user in NestJS:", error)
        }
    }

    // 2. Fallback to legacy API
    if (isKeycloakSession(token)) return { result: false, message: "NestJS service error or unavailable" }
    if (!API_URL || !token) return { result: false, message: "API URL not configured" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/removeDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_id }),
        })

        return await response.json()
    } catch (error) {
        console.error("Error deleting personal:", error)
        return { result: false, message: "Network error" }
    }
}

export async function checkPersonalUsername(personal_username: string): Promise<{ result: boolean; dataReturn?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    // 1. Check in NestJS (Keycloak)
    if (token) {
        try {
            const check = await fetchNestJs<{ exists?: boolean }>(`/api/users/check/${encodeURIComponent(personal_username)}`)
            if (check !== null && typeof check.exists === "boolean") {
                // Return '0' if available, '1' if exists (compatible with legacy UI check)
                return {
                    result: true,
                    dataReturn: check.exists ? "1" : "0",
                }
            }
        } catch (error) {
            console.error("Error checking username in NestJS:", error)
        }
    }

    // 2. Fallback to legacy API
    if (isKeycloakSession(token)) return { result: false }
    if (!API_URL || !token) return { result: false }

    try {
        const response = await fetch(`${API_URL}/StreetLight/checkDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_username }),
        })

        return await response.json()
    } catch (error) {
        console.error("Error checking username:", error)
        return { result: false }
    }
}

export interface UpdatePersonalProfileParams {
    firstname: string
    lastname: string
    password_confirm: string
    password_new?: string
    userId?: string
}

export interface EditPersonalResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: boolean
    message?: string
    requireRelogin?: boolean
}

export async function updatePersonalProfile(data: UpdatePersonalProfileParams): Promise<EditPersonalResponse | { result: false, message: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!token) return { result: false, message: "Unauthorized" }

    // 1. If user is authenticated via Keycloak JWT
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
        const userId = data.userId || payload.sub
        const username = payload.preferred_username || payload.name || payload.email || ""

        // 1.1 Verify current password against Backend IAM Service
        if (!data.password_confirm) {
            return { result: false, message: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน" }
        }

        const verifyResult = await fetchNestJs<{ success: boolean; message?: string }>("/api/users/verify-password", {
            method: "POST",
            body: JSON.stringify({
                username,
                password: data.password_confirm,
            }),
            skipAuth: true,
            skipProject: true,
        })
        if (!verifyResult?.success) {
            return {
                result: false,
                message: verifyResult?.message === "Invalid current password"
                    ? "รหัสผ่านปัจจุบันไม่ถูกต้อง"
                    : (verifyResult?.message || "การตรวจสอบรหัสผ่านไม่สำเร็จ"),
            }
        }

        // 1.2 Update First Name, Last Name, and optional New Password via Backend IAM Service
        const updateResult = await fetchNestJs<boolean | { success?: boolean }>(`/api/users/${encodeURIComponent(userId)}`, {
            method: "PUT",
            body: JSON.stringify({
                firstName: data.firstname,
                lastName: data.lastname,
                password: data.password_new || undefined,
            }),
        })

        if (!updateResult) {
            return {
                result: false,
                message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้บนระบบจัดการ",
            }
        }

        // 1.4 Optional fallback sync to legacy API if configured
        if (API_URL) {
            try {
                await fetch(`${API_URL}/StreetLight/editPersonal`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data),
                }).catch(() => {})
            } catch {
                // Ignore legacy sync failures
            }
        }

        // 1.5 Refresh session token with client ID if password was NOT changed
        const requireRelogin = Boolean(data.password_new)
        if (!data.password_new) {
            const refreshToken = cookieStore.get("refresh_token")?.value
            if (refreshToken) {
                const currentProject = cookieStore.get("current_project")?.value
                let fallbackClientId: string | undefined
                if (currentProject) {
                    const proj = getProjectById(currentProject)
                    if (proj?.domain) {
                        fallbackClientId = proj.domain.split(".")[0].replace(/_/g, "-")
                    }
                }
                const targetClientId = (payload.azp as string) || fallbackClientId || undefined

                const newTokens = await refreshKeycloakToken(refreshToken, targetClientId)
                if (newTokens?.access_token) {
                    const usingHttps = process.env.USING_HTTPS === "true"
                    cookieStore.set("jwt", newTokens.access_token, {
                        httpOnly: true,
                        secure: usingHttps,
                        sameSite: "lax",
                        path: "/",
                    })
                    if (newTokens.refresh_token) {
                        cookieStore.set("refresh_token", newTokens.refresh_token, {
                            httpOnly: true,
                            secure: usingHttps,
                            sameSite: "lax",
                            path: "/",
                        })
                    }
                }
            }
        }

        return {
            result: true,
            apiName: "Keycloak Admin / NestJS",
            dateTime: new Date().toISOString(),
            dataReturn: true,
            requireRelogin,
            message: "อัปเดตข้อมูลโปรไฟล์สำเร็จ",
        }
    }

    // 2. Fallback to legacy API
    if (!API_URL) return { result: false, message: "API URL not configured" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/editPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        })

        return await response.json()
    } catch (error) {
        console.error("Error updating personal profile:", error)
        return { result: false, message: "Network error" }
    }
}
