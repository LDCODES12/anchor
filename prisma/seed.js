const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

const { formatInTimeZone } = require("date-fns-tz")
const dayMs = 24 * 60 * 60 * 1000

const timeZone = "America/Chicago"

function getLocalDateKey(date) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd")
}

function getWeekKey(date) {
  return formatInTimeZone(date, timeZone, "RRRR-'W'II")
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10)

  const [alice, ben] = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@goalgrid.dev" },
      update: {},
      create: {
        name: "Alice Nguyen",
        email: "alice@goalgrid.dev",
        passwordHash,
        timezone: "America/Chicago",
      },
    }),
    prisma.user.upsert({
      where: { email: "ben@goalgrid.dev" },
      update: {},
      create: {
        name: "Ben Ortiz",
        email: "ben@goalgrid.dev",
        passwordHash,
        timezone: "America/Chicago",
      },
    }),
  ])

  const group = await prisma.group.upsert({
    where: { inviteCode: "GG-DEMO" },
    update: {},
    create: {
      name: "GoalGrid Launch Squad",
      inviteCode: "GG-DEMO",
      members: {
        create: [
          { userId: alice.id, role: "ADMIN" },
          { userId: ben.id, role: "MEMBER" },
        ],
      },
    },
  })

  const [dailyGoal, weeklyGoal] = await Promise.all([
    prisma.goal.create({
      data: {
        name: "Write 20 minutes of lab notes",
        cadenceType: "DAILY",
        ownerId: alice.id,
        groupId: group.id,
        pointsPerCheckIn: 10,
        weeklyTargetBonus: 20,
        streakBonus: 5,
      },
    }),
    prisma.goal.create({
      data: {
        name: "Run 3 experiments",
        cadenceType: "WEEKLY",
        weeklyTarget: 3,
        ownerId: ben.id,
        groupId: group.id,
        pointsPerCheckIn: 12,
        weeklyTargetBonus: 25,
        streakBonus: 5,
      },
    }),
  ])

  const now = new Date()
  const recentDays = [0, 1, 2, 3, 5].map((offset) => new Date(now - offset * dayMs))

  for (const day of recentDays) {
    await prisma.checkIn.create({
      data: {
        goalId: dailyGoal.id,
        userId: alice.id,
        timestamp: day,
        localDateKey: getLocalDateKey(day),
        weekKey: getWeekKey(day),
      },
    })
  }

  for (const day of [1, 3, 4]) {
    const date = new Date(now - day * dayMs)
    await prisma.checkIn.create({
      data: {
        goalId: weeklyGoal.id,
        userId: ben.id,
        timestamp: date,
        localDateKey: getLocalDateKey(date),
        weekKey: getWeekKey(date),
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
