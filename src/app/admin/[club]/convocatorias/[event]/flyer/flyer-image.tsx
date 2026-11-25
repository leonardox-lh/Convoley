import { ImageFooter, ImageHeader, type ImageBrand } from "../imagen/image-header";

export interface FlyerDetails {
  venue: string;
  price: string;
  /** "Quedan 6 cupos", or the waitlist call when it's full. */
  spots: string;
  link: string;
}

function Block(props: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", fontSize: 34, opacity: 0.6 }}>{props.label}</span>
      <span style={{ display: "flex", fontSize: 64, fontWeight: 700, color: props.color }}>
        {props.value}
      </span>
    </div>
  );
}

/** HU-37: the 9:16 flyer drawn by Satori (next/og), in the club's colors like the list image. */
export function FlyerImage(props: ImageBrand & FlyerDetails) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
        color: "#18181b",
      }}
    >
      <ImageHeader {...props} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 64,
          padding: "0 72px",
        }}
      >
        <Block label="Cuándo" value={props.when} color="#18181b" />
        <Block label="Dónde" value={props.venue} color="#18181b" />
        <Block label="Precio" value={props.price} color="#18181b" />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "32px 40px",
            borderRadius: 32,
            background: props.primary,
            color: "white",
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          {props.spots}
        </div>
        <span style={{ display: "flex", justifyContent: "center", fontSize: 36, opacity: 0.7 }}>
          {props.link}
        </span>
      </div>
      <ImageFooter />
    </div>
  );
}
