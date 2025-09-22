"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";


export default function Appbar() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className=" text-white z-50 top-0 fixed border-b   w-full justify-between h-16 flex items-center">
      <button
        onClick={() => router.push("/home")}
        className="lg:text-3xl text-2xl ml-4 font-bold lg:ml-8"
      >
        TrashAI
      </button>

      <div className="mr-4  lg:mr-8 justify-between flex">
        <div>
          <div className="relative flex items-center lg:ml-4 ml-4">
            {session?.user ? (
              <>
                <div className="flex h-8 w-8 overflow-hidden items-center">
                  {session?.user.avatarUrl ? (
                    <Image
                      src={session.user.avatarUrl}
                      alt="User Profile Picture"
                      width={192}
                      height={192}
                      className="rounded-full h-8 w-8 overflow-hidden object-cover cursor-pointer"
                    />
                  ) : (
                    <div className="flex items-center justify-center cursor-pointer h-7 w-7 rounded-full border bg-green-600 text-white">
                      {session.user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                onClick={() => router.push("/signin")}
                className="cursor-pointer sm:block block"
              >
                Signin
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
