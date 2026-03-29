function NoPageFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#eef1f7] dark:bg-slate-950">
      <div className="surface-panel max-w-xl w-full p-8 text-center">
        <h1 className="text-6xl text-rose-500 mb-2 font-extrabold">404</h1>

        <img
          src="/404.svg"
          alt="404 Not Found"
          className="w-[260px] h-[260px] mx-auto mb-5"
        />

        <p className="text-xl text-slate-700 dark:text-slate-200 mb-4 font-semibold">
          Oops! The page you were looking for could not be found.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You can try navigating to the{" "}
          <a href="/" className="text-blue-600 underline font-semibold">
            homepage
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default NoPageFound;
