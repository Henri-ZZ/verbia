import type { Metadata } from "next";
import { LegalPage } from "../../../components/legal-page";

export const metadata: Metadata = { title: "退款政策 — Verbia", description: "Verbia Pro 订阅的取消与退款规则。", alternates: { canonical: "/zh/refund", languages: { en: "/refund", "zh-CN": "/zh/refund" } } };

export default function RefundPage() { return <LegalPage locale="zh" eyebrow="退款政策" title="Verbia 退款政策" description="我们希望订阅决定清楚透明，并让新客户有合理机会确认 Verbia Pro 是否适合自己。">
  <section><h2>1. 谁处理你的购买</h2><p>Waffo.com Limited 是 Verbia Pro 的记录商户和授权经销商，负责扣款、税费、收据、退款和付款争议。本政策说明 Verbia 为产品提供的退款规则，并与 <a href="https://www.waffo.ai/en/buyer-terms" target="_blank" rel="noreferrer">Waffo 买家条款</a>及适用法律赋予的强制性权利共同适用。Waffo 负责执行退款申请，并对付款处理作出最终决定。</p></section>
  <section><h2>2. 首次订阅付款</h2><p>首次购买 Verbia Pro 后 14 个自然日内，你可以申请全额退款。请简单说明未达到预期的原因，以便我们核验订单并改善产品。反复订阅后退款、组织多个账号规避额度等滥用行为可能不符合退款资格，但法律强制要求退款的情形除外。</p></section>
  <section><h2>3. 自动续费付款</h2><p>续费扣款后 7 个自然日内，如果你在新计费周期中尚未大量使用 Pro，可以申请退款。实际判断中，续费后使用不超过 10 次 Pro 生成不视为大量使用。超过该期限后，我们通常不退还计费周期中未使用部分的费用。</p></section>
  <section><h2>4. 服务问题与账单错误</h2><p>以上期限和用量门槛不限制法律规定的救济。如果出现重复或错误扣款、未经授权的付款、Pro 未能开通、长时间严重不可用，或产品与描述存在重大差异且我们无法在合理时间内解决，我们也会支持适当的全额或部分退款。</p></section>
  <section><h2>5. 取消订阅</h2><p>你可以随时通过 Waffo 订单邮件中的 Buyer Portal 取消自动续订。Waffo 要求至少在续订日期前 48 小时取消。取消通常在当前已付费周期结束时生效，在此之前你仍可使用 Pro。卸载扩展、停止使用或删除 Verbia 账号不会自动取消 Waffo 订阅。</p></section>
  <section><h2>6. 如何申请退款</h2><ol><li>打开 Waffo 订单邮件，通过其中的 Buyer Portal 提交退款申请；也可以发送邮件至 <a href="mailto:henri@henriz.dev">henri@henriz.dev</a>。</li><li>提供 Verbia 账号邮箱、Waffo 订单号或付款编号、购买日期、原因和申请金额。请勿发送银行卡信息。</li><li>为了核验账号、用量或技术问题，我们可能要求少量补充信息。</li></ol><p>Waffo 买家条款允许在其规定的退款申请期内通过 Buyer Portal 提交申请。获批退款会退回原付款方式，到账时间由银行和付款网络决定。Waffo 表示，批准后处理可能需要最多 14 个工作日。</p></section>
  <section><h2>7. 退款后的权益</h2><p>全额退款会终止相应的 Pro 权益；部分退款可能缩短或调整使用期限。如果付款被撤销、拒付或认定为未经授权，相关权益可能在调查期间暂停。发起拒付前，请先联系我们或 Waffo，以便我们有机会解决问题。</p></section>
  <section><h2>8. 消费者权利</h2><p>本政策不排除适用于你的法律中不可放弃的冷静期权利、数字服务缺陷救济或其他消费者权利。如果强制性法律提供更有利的权利，以该法律为准。</p></section>
</LegalPage>; }
