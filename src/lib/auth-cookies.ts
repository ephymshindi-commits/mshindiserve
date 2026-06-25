import type { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set("ms_access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });

  response.cookies.set("ms_refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of ["ms_access_token", "ms_refresh_token"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}
