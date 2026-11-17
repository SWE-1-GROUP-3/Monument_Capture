// Styles for the map home and its bottom sheets, adapted from the
// monument-capture-map.html mockup. Everything is scoped under .mc-home and
// positioned inside the home screen (not fixed to the window), so it never
// overlays screens pushed on top of the map.
import { theme } from "../constants/theme";

const c = theme.colors;

export const GAME_CSS = `
.mc-home{position:relative;width:100%;height:100%;overflow:hidden;background:#cfe9d6;color:${c.ink}}
.mc-home *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.mc-map{position:absolute;inset:0;z-index:0;background:#cfe9d6}
.mc-map .leaflet-container{width:100%;height:100%;background:#cfe9d6;font:inherit}
.mc-map .leaflet-tile-pane{filter:saturate(1.35) hue-rotate(-8deg) brightness(1.04) contrast(.95)}
.mc-map .leaflet-control-attribution{font-size:9px;opacity:.7;margin-bottom:96px!important}
.mc-fog{position:absolute;left:0;right:0;pointer-events:none;z-index:400}
.mc-fog.top{top:0;height:140px;background:linear-gradient(#bfe3f5 0%,rgba(191,227,245,.55) 45%,rgba(191,227,245,0) 100%)}
.mc-fog.bottom{bottom:0;height:130px;background:linear-gradient(rgba(23,50,58,0),rgba(23,50,58,.18))}

.mc-status{position:absolute;top:16px;left:16px;z-index:500;display:flex;align-items:center;gap:8px;max-width:calc(100% - 96px);
  background:rgba(255,255,255,.92);border-radius:999px;padding:6px 14px 6px 6px;box-shadow:0 4px 14px rgba(0,0,0,.15);font-weight:700;font-size:14px;line-height:1.15}
.mc-status .dot{width:28px;height:28px;border-radius:50%;background:${c.brand};display:grid;place-items:center;color:#fff;font-size:15px;flex:none}
.mc-status .txt{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mc-status small{display:block;font-weight:500;color:${c.muted};font-size:11px;line-height:1.1}

.mc-round{width:52px;height:52px;border-radius:50%;background:#fff;border:none;box-shadow:0 4px 14px rgba(0,0,0,.2);
  display:grid;place-items:center;cursor:pointer;padding:0;color:${c.ink};font:inherit}
.mc-round:active{transform:scale(.94)}
.mc-compass{position:absolute;top:16px;right:16px;z-index:500}
.mc-compass.spin svg{animation:mc-spin .5s ease}
@keyframes mc-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.mc-zoom{position:absolute;right:20px;top:84px;z-index:500;display:flex;flex-direction:column;gap:10px}
.mc-zoom .mc-round{width:44px;height:44px;font-size:24px;font-weight:800;line-height:1}
.mc-zoom .mc-round:disabled{opacity:.45;cursor:default}

.mc-me{position:relative;width:46px;height:46px;pointer-events:none}
.mc-me .pulse{position:absolute;inset:0;border-radius:50%;background:rgba(22,163,127,.35);animation:mc-pulse 2s ease-out infinite}
.mc-me .body{position:absolute;inset:7px;border-radius:50%;background:linear-gradient(145deg,${c.brandLight},${c.brandDark});
  border:4px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.3);display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px;letter-spacing:.2px}
@keyframes mc-pulse{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.8);opacity:0}}

.mc-mon{position:relative;width:44px;height:58px;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3));animation:mc-bob 2.6s ease-in-out infinite;cursor:pointer}
.mc-mon .pin{position:absolute;left:0;top:0;width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff}
.mc-mon .ico{position:absolute;left:0;top:0;width:44px;height:44px;display:grid;place-items:center;font-size:20px}
.mc-mon .base{position:absolute;left:12px;bottom:0;width:20px;height:6px;border-radius:50%;background:rgba(0,0,0,.25)}
.mc-mon.free .pin{background:${c.free}} .mc-mon.held .pin{background:${c.held}} .mc-mon.mine .pin{background:${c.mine}}
.mc-mon.inactive .pin{background:#9fb3ad}
@keyframes mc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

.mc-bar{position:absolute;left:0;right:0;bottom:0;z-index:600;display:flex;justify-content:space-between;align-items:flex-end;
  padding:0 22px calc(16px + env(safe-area-inset-bottom));pointer-events:none;max-width:620px;margin:0 auto}
.mc-tab{pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;
  font:inherit;font-weight:800;font-size:13px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.45);position:relative}
.mc-tab .mc-round{width:64px;height:64px;font-size:28px}
.mc-tab .count{position:absolute;top:-4px;right:-4px;min-width:24px;height:24px;border-radius:999px;background:${c.held};color:#fff;
  border:3px solid #fff;font-size:12px;line-height:18px;padding:0 5px;text-shadow:none}
.mc-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(145deg,${c.brandLight},${c.brandDark});border:4px solid #fff;
  box-shadow:0 4px 14px rgba(0,0,0,.25);display:grid;place-items:center;font-size:22px;color:#fff;font-weight:800;position:relative;text-shadow:none;flex:none}
.mc-avatar .lvl{position:absolute;bottom:-6px;right:-6px;background:${c.levelYellow};color:${c.ink};border:3px solid #fff;
  border-radius:999px;font-size:11px;padding:0 6px;line-height:18px;white-space:nowrap}

.mc-scrim{position:absolute;inset:0;background:rgba(10,25,30,.35);z-index:700;opacity:0;pointer-events:none;transition:opacity .25s}
.mc-scrim.on{opacity:1;pointer-events:auto}
.mc-sheet{position:absolute;left:0;right:0;bottom:0;z-index:800;background:${c.card};border-radius:26px 26px 0 0;
  padding:10px 20px calc(24px + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .3s cubic-bezier(.2,.8,.2,1);
  max-height:78%;overflow:auto;max-width:560px;margin:0 auto;box-shadow:0 -8px 30px rgba(0,0,0,.2);visibility:hidden}
.mc-sheet.on{transform:translateY(0);visibility:visible}
.mc-grab{width:44px;height:5px;border-radius:9px;background:${c.line};margin:0 auto 12px}
.mc-sheet h2{margin:0;font-size:24px;line-height:1.1;font-weight:800}
.mc-sub{color:${c.muted};font-size:14px;margin-top:2px}
.mc-pill{display:inline-block;border-radius:999px;padding:1px 12px;font-size:13px;font-weight:800;color:#fff;margin-top:10px}
.mc-rows{margin:14px 0;border-top:1px solid ${c.line}}
.mc-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid ${c.line};font-size:15px}
.mc-row span:first-child{color:${c.muted}} .mc-row span:last-child{font-weight:700;text-align:right}
.mc-cta{width:100%;border:none;border-radius:16px;padding:14px;font:inherit;font-size:18px;font-weight:800;color:#fff;
  background:${c.brand};box-shadow:0 4px 0 ${c.brandDark};cursor:pointer;margin-top:4px}
.mc-cta:active{transform:translateY(2px);box-shadow:0 2px 0 ${c.brandDark}}
.mc-cta[disabled]{background:${c.disabled};box-shadow:0 4px 0 ${c.disabledDark};cursor:not-allowed;transform:none}
.mc-cta.dark{background:${c.ink};box-shadow:0 4px 0 ${c.inkDark}}
.mc-cta.dark:active{box-shadow:0 2px 0 ${c.inkDark}}
.mc-cta.ghost{background:#fff;color:${c.ink};box-shadow:0 4px 0 ${c.line};border:2px solid ${c.line}}
.mc-hint{text-align:center;color:${c.muted};font-size:13px;margin-top:8px}
.mc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
.mc-stat{background:${c.tile};border-radius:16px;padding:10px;text-align:center}
.mc-stat b{display:block;font-size:24px;line-height:1.2} .mc-stat span{font-size:12px;color:${c.muted}}
.mc-list{list-style:none;margin:10px 0 0;padding:0}
.mc-list li{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid ${c.line}}
.mc-list li.tap{cursor:pointer}
.mc-list .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:18px;flex:none;background:${c.tile}}
.mc-list .ic img{width:40px;height:40px;border-radius:12px;object-fit:cover}
.mc-list b{display:block;font-size:15px;line-height:1.2} .mc-list small{color:${c.muted};font-size:13px;line-height:1.25;display:block}
.mc-list .go{margin-left:auto;color:${c.muted};font-size:20px;flex:none}
.mc-empty{text-align:center;color:${c.muted};padding:22px 8px;font-size:14px}
.mc-empty b{display:block;color:${c.ink};font-size:16px;margin-bottom:2px}
.mc-tabs{display:flex;gap:8px;margin-top:12px}
.mc-tabs button{flex:1;border:2px solid ${c.line};background:#fff;border-radius:12px;padding:6px;font:inherit;font-weight:700;cursor:pointer;color:${c.ink}}
.mc-tabs button.on{background:${c.ink};border-color:${c.ink};color:#fff}
.mc-small-btn{border:2px solid ${c.line};background:#fff;border-radius:999px;padding:2px 12px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;color:${c.ink}}
.mc-small-btn.on{background:${c.ink};border-color:${c.ink};color:#fff}
.mc-section{font-size:13px;font-weight:800;color:${c.muted};text-transform:uppercase;letter-spacing:.6px;margin:18px 0 6px}

.mc-rec{border:2px solid ${c.line};border-radius:18px;padding:12px 14px;margin-top:10px;cursor:pointer;background:#fff;display:block;width:100%;text-align:left;font:inherit;color:inherit}
.mc-rec.open{border-color:${c.brand}}
.mc-rec-head{display:flex;gap:12px;align-items:center}
.mc-rec-head .ic{width:44px;height:44px;border-radius:14px;background:${c.tile};display:grid;place-items:center;font-size:20px;flex:none}
.mc-rec-head b{display:block;font-size:16px;line-height:1.15}
.mc-rec-head small{color:${c.muted};font-size:13px}
.mc-rec-count{margin-left:auto;text-align:center;flex:none}
.mc-rec-count b{font-size:26px;line-height:1;color:${c.mine}}
.mc-rec-count span{display:block;font-size:11px;color:${c.muted}}
.mc-rec-body{display:none;margin-top:10px}
.mc-rec.open .mc-rec-body{display:block}
.mc-rec-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mc-rec-grid div{background:#f7faf9;border-radius:12px;padding:8px 10px}
.mc-rec-grid span{display:block;font-size:11px;color:${c.muted}}
.mc-rec-grid b{font-size:15px}
.mc-bar-track{height:8px;border-radius:9px;background:${c.line};margin-top:10px;overflow:hidden}
.mc-bar-fill{height:100%;border-radius:9px;background:linear-gradient(90deg,${c.brand},${c.brandLight})}
.mc-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.mc-badge{font-size:12px;font-weight:800;border-radius:999px;padding:1px 10px;background:#fff4d6;color:#8a5a00}
.mc-sort{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.mc-sort button.on{background:${c.mine};border-color:${c.mine};color:#fff}
.mc-you{background:${c.mineSoft};border-radius:14px;padding:10px 12px;margin:12px 0;font-size:14px}
.mc-you b{color:${c.mine}}
.mc-notice{border-radius:14px;padding:10px 12px;margin:10px 0;font-size:14px;font-weight:600}
.mc-notice.ok{background:${c.primarySoft};color:${c.brandDark}}
.mc-notice.bad{background:${c.dangerSoft};color:${c.danger}}

@media (prefers-reduced-motion: reduce){
  .mc-mon,.mc-me .pulse{animation:none}
  .mc-sheet,.mc-scrim{transition:none}
  .mc-compass.spin svg{animation:none}
}
`;
