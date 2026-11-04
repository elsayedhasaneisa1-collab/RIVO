import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/", small = false }: { href?: string; small?: boolean }) {
  return (
    <Link href={href} className={`group flex shrink-0 items-center ${small ? "w-[104px]" : "w-[132px] sm:w-[154px]"}`} aria-label="RIVO الرئيسية" dir="ltr">
      <span className="relative block aspect-[3/1] w-full transition-transform duration-300 group-hover:scale-[1.04]">
        <Image src="/images/rivo-logo-dark.png" alt="RIVO - Your Style, Your Choice" fill priority className="object-contain logo-dark" sizes={small ? "104px" : "154px"} />
        <Image src="/images/rivo-logo-light.png" alt="" fill priority className="object-contain logo-light" sizes={small ? "104px" : "154px"} />
      </span>
    </Link>
  );
}
