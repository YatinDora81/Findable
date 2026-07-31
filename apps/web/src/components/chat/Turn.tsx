import type { Message } from "../../lib/types";
import { AnswerBody } from "./AnswerBody";

type Props = { message: Message };

export function Turn({ message }: Props) {
  return (
    <div className="animate-rise mb-9">
      {message.role === "USER" ? (
        <p className="border-l-2 border-accent pl-[15px] text-[19px] font-medium leading-[1.45] tracking-[-0.022em]">
          {message.content}
        </p>
      ) : (
        <AnswerBody text={message.content} citations={message.citations} />
      )}
    </div>
  );
}
