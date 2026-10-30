import { Fragment } from "react";

// A headline line on a signal block. Lines are joined with explicit breaks so
// the block hugs the widest line instead of stretching to the column.
export function Highlight({ lines }: { lines: string[] }) {
  return (
    <span className="highlight">
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </span>
  );
}
