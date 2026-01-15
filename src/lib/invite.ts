import { randomBytes } from "crypto"

export function generateInviteCode() {
  return `GG-${randomBytes(2).toString("hex").toUpperCase()}`
}
