import prisma from "@/lib/prisma";

export const saveUser = async (user) => {
    try {
        const dbUser = await prisma.user.upsert({
            // check if user exists
            where: {
                clerkId: user.id
            },
            update: {
                name: `${user.firstName} ${user.lastName}`.trim()
            },
            // if user does not exist, create it
            create: {
                clerkId: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
            }
        })
        return dbUser
    } catch (error) {
        console.error("Failed to save user to database:", error);
        throw new Error("Could not sync user to database");
    }
}
