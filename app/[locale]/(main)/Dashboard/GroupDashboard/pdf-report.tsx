import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer"
import { DashboardData } from "@/app/actions/dashboard"

// Register Thai fonts
Font.register({
    family: "Sarabun",
    fonts: [
        { src: "/fonts/Sarabun-Regular.ttf" },
        { src: "/fonts/Sarabun-Bold.ttf", fontWeight: "bold" },
    ],
})

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 36,
        fontFamily: "Sarabun",
    },
    // ─── Header ───────────────────────────────────────────────────────────────
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 18,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: "#0ea5e9",
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0f172a",
    },
    subtitle: {
        fontSize: 11,
        color: "#64748b",
        marginTop: 3,
    },
    headerMeta: {
        fontSize: 9,
        color: "#94a3b8",
        textAlign: "right",
    },
    // ─── KPI Section ──────────────────────────────────────────────────────────
    kpiGrid: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    kpiCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 6,
        padding: 10,
        backgroundColor: "#f8fafc",
    },
    kpiLabel: {
        fontSize: 7.5,
        color: "#64748b",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    kpiValue: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#0ea5e9",
        marginBottom: 1,
    },
    kpiValueRed: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#ef4444",
        marginBottom: 1,
    },
    kpiValueGreen: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#22c55e",
        marginBottom: 1,
    },
    kpiUnit: {
        fontSize: 8,
        color: "#94a3b8",
        marginBottom: 6,
    },
    kpiDivider: {
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        marginTop: 6,
        paddingTop: 4,
    },
    kpiFooterLabel: {
        fontSize: 7.5,
        fontWeight: "bold",
        color: "#475569",
    },
    // ─── Charts ───────────────────────────────────────────────────────────────
    sectionTitle: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 6,
        marginTop: 4,
        paddingLeft: 4
    },
    chartContainer: {
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8,
        backgroundColor: "#ffffff",
    },
    chartImage: {
        width: "100%",
        height: 210,
        objectFit: "contain",
    },
    // ─── Footer ───────────────────────────────────────────────────────────────
    footer: {
        position: "absolute",
        bottom: 24,
        left: 36,
        right: 36,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 8,
    },
    footerText: {
        fontSize: 9,
        color: "#94a3b8",
    },
})

interface PdfTranslations {
    summaryOnlineTotal: string
    summaryLamp: string
    summaryLampFailure: string
    summaryOnlineStatus: string
    summaryFailureCount: string
    summaryVoltage: string
    summaryVolt: string
    summaryAverageVoltage: string
    summaryEnergyConsumption: string
    summaryKwh: string
    summaryPerMonth: string
    footerSystem: string
    printDate: string
    pageStr: string
}

interface PDFReportProps {
    data: DashboardData
    reportTitle: string
    dateRange: string
    energyChartImage?: string
    failureChartImage?: string
    t: PdfTranslations
}

export function IoTReportPDF({ data, reportTitle, dateRange, energyChartImage, failureChartImage, t }: PDFReportProps) {
    const totalEnergy = data.toTalAvgUnit || "0.00"
    const avgVoltage = data.toTalAvgVolt || "0.00"
    const totalFailure = data.totalRTULose || "0"

    const totalLamps = data.projectTotalLamp ? parseInt(data.projectTotalLamp) : 0
    const failureCount = parseInt(totalFailure)
    const onlineLamps = Math.max(0, totalLamps - failureCount)

    const voltageValue = Math.round(parseFloat(avgVoltage || "0"))
    const energyValue = parseFloat(totalEnergy || "0").toFixed(2)

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>{reportTitle}</Text>
                        <Text style={styles.subtitle}>{dateRange}</Text>
                    </View>
                    <Text style={styles.headerMeta}>{t.printDate}</Text>
                </View>

                {/* ── KPI Cards 2×2 ── */}
                <View style={styles.kpiGrid}>
                    {/* Card 1 – Online */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t.summaryOnlineTotal}</Text>
                        <Text style={styles.kpiValue}>{onlineLamps} / {totalLamps}</Text>
                        <Text style={styles.kpiUnit}>{t.summaryLamp}</Text>
                        <View style={styles.kpiDivider}>
                            <Text style={styles.kpiFooterLabel}>{t.summaryOnlineStatus}</Text>
                        </View>
                    </View>

                    {/* Card 2 – Failure */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t.summaryLampFailure}</Text>
                        <Text style={styles.kpiValueRed}>{failureCount}</Text>
                        <Text style={styles.kpiUnit}>{t.summaryLamp}</Text>
                        <View style={styles.kpiDivider}>
                            <Text style={styles.kpiFooterLabel}>{t.summaryFailureCount}</Text>
                        </View>
                    </View>

                    {/* Card 3 – Voltage */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t.summaryVoltage}</Text>
                        <Text style={styles.kpiValueGreen}>{voltageValue}</Text>
                        <Text style={styles.kpiUnit}>{t.summaryVolt}</Text>
                        <View style={styles.kpiDivider}>
                            <Text style={styles.kpiFooterLabel}>{t.summaryAverageVoltage}</Text>
                        </View>
                    </View>

                    {/* Card 4 – Energy */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t.summaryEnergyConsumption}</Text>
                        <Text style={styles.kpiValue}>{energyValue}</Text>
                        <Text style={styles.kpiUnit}>{t.summaryKwh}</Text>
                        <View style={styles.kpiDivider}>
                            <Text style={styles.kpiFooterLabel}>{t.summaryPerMonth}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Energy Chart ── */}
                {energyChartImage && (
                    <>
                        <Text style={styles.sectionTitle}>{t.summaryEnergyConsumption} (kWh)</Text>
                        <View style={styles.chartContainer}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text */}
                            <Image src={energyChartImage} style={styles.chartImage} />
                        </View>
                    </>
                )}

                {/* ── Failure Chart ── */}
                {failureChartImage && (
                    <>
                        <Text style={styles.sectionTitle}>{t.summaryLampFailure}</Text>
                        <View style={styles.chartContainer}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text */}
                            <Image src={failureChartImage} style={styles.chartImage} />
                        </View>
                    </>
                )}

                {/* ── Footer ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{t.footerSystem}</Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) =>
                            t.pageStr
                                .replace("{pageNumber}", String(pageNumber))
                                .replace("{totalPages}", String(totalPages))
                        }
                    />
                </View>

            </Page>
        </Document>
    )
}
