import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

    let despesasCount = 0;
    let recebimentosCount = 0;
    let errorMsg = null;

    try {
      const despesasSnap = await firestore.collection("consultorios").doc("desperte-psique").collection("despesas").get();
      despesasCount = despesasSnap.docs.length;

      const recebimentosSnap = await firestore.collection("consultorios").doc("desperte-psique").collection("recebimentos").get();
      recebimentosCount = recebimentosSnap.docs.length;
    } catch (err: any) {
      errorMsg = err.message || String(err);
    }

    return NextResponse.json({
      success: !errorMsg,
      despesasCount,
      recebimentosCount,
      error: errorMsg,
      envStatus: {
        hasProjectId,
        hasClientEmail,
        hasPrivateKey,
        projectIdVal: process.env.FIREBASE_PROJECT_ID || "NENHUM"
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || String(err)
    }, { status: 500 });
  }
}
