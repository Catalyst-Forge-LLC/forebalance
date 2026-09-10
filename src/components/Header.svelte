<header>
  <h1>
    <img src="/logo.svg" width="48" height="48" alt="" />
    ForeBalance
  </h1>
</header>

<style lang="scss">
  header {
    top: 0;
    left: 0;
    width: 100%;

    h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      text-align: center;
      background-color: #009900;
      color: #fff;
      font-size: calc(min(7vw, 3.5rem));
      font-weight: 100;
      line-height: 1.1;
      margin: 0 0 1rem 0;
      padding: 0.45rem 0;
      border-bottom-left-radius: 3rem;
      border-bottom-right-radius: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.66);
      text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
      box-shadow:
        inset 0 2rem 4rem -2rem rgba(0, 0, 0, 0.5),
        inset 0 0.5rem 1rem -0.5rem rgba(0, 0, 0, 0.95),
        0 0 0.15rem rgba(0, 0, 0, 0.85),
        0 0.25rem 0.5rem rgba(0, 0, 0, 0.5);
    }

    img {
      width: calc(min(10vw, 3rem));
      height: calc(min(10vw, 3rem));
      border-radius: 0.55rem;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
  }
</style>
