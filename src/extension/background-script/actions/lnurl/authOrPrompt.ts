import PubSub from "pubsub-js";
import utils from "~/common/lib/utils";
import db from "~/extension/background-script/db";
import state from "~/extension/background-script/state";
import type {
  MessageWebLnLnurl,
  LNURLDetails,
  LnurlAuthResponse,
} from "~/types";

import { authFunction } from "./auth";

async function authOrPrompt(
  message: MessageWebLnLnurl,
  lnurlDetails: LNURLDetails
) {
  if (!("host" in message.origin)) return;

  PubSub.publish(`lnurl.auth.start`, { message, lnurlDetails });

  // get the publisher to check if lnurlAuth for auto-login is enabled
  const allowance = await db.allowances
    .where("host")
    .equalsIgnoreCase(message.origin.host)
    .first();

  // we have the check the unlock status manually. The account can still be locked
  // If it is locked we must show a prompt to unlock
  const isUnlocked = state.getState().isUnlocked();

  // check if there is a publisher and lnurlAuth is enabled,
  // otherwise we we prompt the user
  if (isUnlocked && allowance && allowance.enabled && allowance.lnurlAuth) {
    return await authFunction({ lnurlDetails, origin: message.origin });
  } else {
    try {
      const promptMessage = {
        ...message,
        action: "lnurlAuth",
        args: {
          ...message.args,
          lnurlDetails,
        },
      };

      return await utils.openPrompt<LnurlAuthResponse>(promptMessage);
    } catch (e) {
      // user rejected
      return { error: e instanceof Error ? e.message : e };
    }
  }
}

export default authOrPrompt;
