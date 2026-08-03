import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const JWT_EXPIRES_IN = "7d"; //temps d'expiration 7 jours

//fonction de hashage de mot de passe
export async function hashPassword(plainPassword: string): Promise<string> {
    const saltRounds = 10; // nombre de tours de hash
    return bcrypt.hash(plainPassword, saltRounds);
}

//fonction pour comparer un mot de passe claire avec le hashed mot de passe
export async function comparePassword(
    plainPassword: string,
    hashedPassword: string
): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}

//type pour les données sauvegardé
export type JwtPayload = {
    userId: number,
    roleId: number,
    roleName: string,
    username: string
}

//fonction pour creer un token jwt
export async function signJWT(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET);
}

//fonction pour vérifier un token jwt
export async function verifyJWT(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as JwtPayload;
    } catch {
        return null;
    }
}

