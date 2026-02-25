export async function GET() {
    const dbUrl = process.env.DATABASE_URL
    return Response.json({
        hasDbUrl: !!dbUrl,
        length: dbUrl?.length,
        prefix: dbUrl?.substring(0, 25),
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('CLERK') || k.includes('NEON'))
    })
}
