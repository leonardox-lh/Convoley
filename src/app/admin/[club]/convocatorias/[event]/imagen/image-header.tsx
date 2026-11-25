/** Club header and footer shared by the list (HU-16) and teams (HU-32) images, for Satori. */
export interface ImageBrand {
  clubName: string;
  title: string;
  when: string;
  primary: string;
  secondary: string;
  logo: string | null;
}

export function ImageHeader(props: ImageBrand) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "40px 56px",
        background: props.primary,
        color: "white",
        borderBottom: `12px solid ${props.secondary}`,
      }}
    >
      {props.logo && (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
        <img src={props.logo} alt="" width={120} height={120} style={{ borderRadius: 999 }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", fontSize: 30, opacity: 0.85 }}>{props.clubName}</span>
        <span style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>{props.title}</span>
        <span style={{ display: "flex", fontSize: 28 }}>{props.when}</span>
      </div>
    </div>
  );
}

export function ImageFooter() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "0 56px 24px",
        fontSize: 22,
        opacity: 0.5,
      }}
    >
      convoley
    </div>
  );
}
