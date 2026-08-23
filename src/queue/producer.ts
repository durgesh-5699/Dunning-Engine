import {redis} from "./redisClient.ts"

export async function pushToFailureStream(failureId:string){
    await redis.xadd(
        "payment-failures",
        "*",
        "failureId", failureId.toString()
    )
}