"use server"

import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import {
    registerProject,
    unregisterProject,
    DEFAULT_PROJECT,
    normalizeNestProject,
    resolveProjectUuid,
} from "@/config/projects"
import type { ProjectConfig, ColorPreset, NestProjectRaw } from "@/config/projects"
import { fetchNestJs } from "@/lib/nestjs"

export async function getProjectsList(): Promise<ProjectConfig[]> {
    // Fetch directly from Backend API
    try {
        const nestProjects = await fetchNestJs<NestProjectRaw[]>("/api/projects", { skipProject: true })
        if (nestProjects && Array.isArray(nestProjects) && nestProjects.length > 0) {
            const mapped = nestProjects.map((p) => normalizeNestProject(p))
            mapped.forEach((p) => registerProject(p))
            return mapped
        }
    } catch (e) {
        console.error("Error fetching projects from backend:", e)
    }

    return []
}

export async function checkProjectId(id: string): Promise<{ result: boolean; exists: boolean }> {
    const cleanId = id.trim().toLowerCase()
    if (DEFAULT_PROJECT && cleanId === DEFAULT_PROJECT.toLowerCase()) {
        return { result: true, exists: true }
    }
    const projects = await getProjectsList()
    const exists = projects.some((p) => p.id.toLowerCase() === cleanId || p.code?.toLowerCase() === cleanId)
    return { result: true, exists }
}

export interface SaveProjectPayload {
    id?: string
    code?: string
    name: string
    domain: string
    logo: string
    appIcon: string
    color: ColorPreset
    enableLoginOtp?: boolean
    actionData: "ADD" | "EDIT"
}

export async function saveProject(payload: SaveProjectPayload): Promise<{ result: boolean; message?: string }> {
    const enteredId = (payload.id && payload.id.trim()) ? payload.id.trim().toLowerCase() : ""
    const isEnteredUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(enteredId)
    const id = isEnteredUuid ? enteredId : (payload.actionData === "EDIT" ? (resolveProjectUuid(enteredId) || enteredId) : randomUUID())
    const name = payload.name.trim()
    const code = (payload.code && payload.code.trim())
        ? payload.code.trim().toLowerCase()
        : (!isEnteredUuid && enteredId ? enteredId : (payload.domain ? payload.domain.split('.')[0] : "project"))
    const domain = payload.domain?.trim() || `${code}.localhost`
    const logo = payload.logo.trim() || "/logo-le-full.svg"
    const appIcon = payload.appIcon.trim() || "/logo-le.svg"
    const color = payload.color || "skyblue"
    const enableLoginOtp = Boolean(payload.enableLoginOtp)

    if (!name) {
        return { result: false, message: "Project Name is required" }
    }

    const config: ProjectConfig = {
        id,
        uuid: id,
        code,
        name,
        domain: domain || `${code}.localhost`,
        logo,
        appIcon,
        color,
        enableLoginOtp,
    }

    // Save via Backend API (Backend API-IAM automatically syncs Keycloak client OTP flow)
    try {
        const body = {
            id,
            code,
            name,
            domain: domain || `${code}.localhost`,
            logo,
            sidebar_logo: logo,
            sidebarLogo: logo,
            app_icon: appIcon,
            appIcon,
            favicon_logo: appIcon,
            faviconLogo: appIcon,
            color,
            enable_login_otp: enableLoginOtp,
            enableLoginOtp,
        }

        let nestRes: { result?: boolean; success?: boolean; id?: string } | null = null
        if (payload.actionData === "ADD") {
            nestRes = await fetchNestJs<{ result?: boolean; success?: boolean; id?: string }>("/api/projects", {
                method: "POST",
                body: JSON.stringify(body),
                skipProject: true,
            })
        } else {
            const targetId = resolveProjectUuid(id) || id
            nestRes = await fetchNestJs<{ result?: boolean; success?: boolean; id?: string }>(`/api/projects/${encodeURIComponent(targetId)}`, {
                method: "PUT",
                body: JSON.stringify(body),
                skipProject: true,
            })
        }

        if (nestRes) {
            const finalId = (nestRes as { id?: string }).id || id
            const finalConfig = { ...config, id: finalId, uuid: finalId, code }
            registerProject(finalConfig)
            return { result: true }
        }
    } catch (e) {
        console.error("Failed to save project to backend:", e)
        return { result: false, message: e instanceof Error ? e.message : "Failed to save project to backend" }
    }

    return { result: false, message: "Failed to save project to backend" }
}

export async function deleteProject(id: string): Promise<{ result: boolean; message?: string }> {
    const cleanId = id.trim().toLowerCase()
    if (cleanId === DEFAULT_PROJECT.toLowerCase()) {
        return { result: false, message: "Cannot delete default project" }
    }

    // Delete via Backend API
    try {
        const targetId = resolveProjectUuid(cleanId) || cleanId
        const nestRes = await fetchNestJs<{ result?: boolean; success?: boolean }>(`/api/projects/${encodeURIComponent(targetId)}`, {
            method: "DELETE",
            skipProject: true,
        })
        if (nestRes) {
            unregisterProject(cleanId)
            unregisterProject(targetId)
            return { result: true }
        }
    } catch (e) {
        console.error("Failed to delete project from backend:", e)
        return { result: false, message: e instanceof Error ? e.message : "Failed to delete project from backend" }
    }

    return { result: false, message: "Failed to delete project from backend" }
}

export async function uploadProjectAsset(formData: FormData): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
        const file = formData.get("file") as File | null
        const assetType = (formData.get("type") as string) || "asset"

        if (!file) {
            return { success: false, message: "No file provided" }
        }

        const allowedExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"]
        const originalName = file.name || "image.png"
        const ext = path.extname(originalName).toLowerCase() || ".png"

        if (!allowedExtensions.includes(ext)) {
            return { success: false, message: "Unsupported file format. Please upload PNG, JPG, SVG, WEBP, or ICO." }
        }

        // Limit file size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, message: "File size exceeds 5MB limit" }
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadDir = path.join(process.cwd(), "public", "uploads", "projects")
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
        }

        const cleanType = assetType.replace(/[^a-zA-Z0-9_-]/g, "")
        const filename = `${cleanType}_${Date.now()}${ext}`
        const filePath = path.join(uploadDir, filename)

        fs.writeFileSync(filePath, buffer)

        return { success: true, url: `/uploads/projects/${filename}` }
    } catch (error) {
        console.error("Failed to upload project asset:", error)
        return { success: false, message: "Failed to upload file" }
    }
}

