import type { Metadata } from "next";
import { LegalPage } from "../../../components/legal-page";

export const metadata: Metadata = { title: "退款政策 — Verbia", description: "Verbia Premium 订阅的取消与退款规则。", alternates: { canonical: "/zh/refund", languages: { en: "/refund", "zh-CN": "/zh/refund" } } };

export default function RefundPage() { return <LegalPage locale="zh" eyebrow="退款政策" title="Verbia 退款政策" description="本政策说明 Verbia Premium 订阅可以退款的情形，以及如何取消后续自动续费。">
  <section><h2>1. 谁处理你的购买</h2><p>Waffo.com Limited 是 Verbia Premium 的记录商户和授权经销商，负责扣款、税费、收据、退款和付款争议。本政策说明 Verbia 为产品提供的退款规则，并与 <a href="https://www.waffo.ai/en/buyer-terms" target="_blank" rel="noreferrer">Waffo 买家条款</a>及适用法律赋予的强制性权利共同适用。Waffo 负责执行退款申请，并对付款处理作出最终决定。</p></section>
  <section><h2>2. 一般退款规则</h2><p>Premium 权益开通或使用后，订阅费用通常不予退还。仅因改变主意、未使用服务、忘记取消，或只使用了计费周期的一部分，我们不提供退款或余额补偿。如果扣款后尚未使用 Premium，你可以尽快联系我们；我们可酌情批准退款，但这并非退款保证。</p></section>
  <section><h2>3. 自动续费付款</h2><p>自动续费款通常不予退还。如果不希望订阅续费，请在下一个扣款日前取消。取消会停止未来续费，通常不会退还当前已付费周期的费用，也不会缩短当前权益期限。</p></section>
  <section><h2>4. 服务问题与账单错误</h2><p>如果出现重复或错误扣款、未经授权的付款、Premium 未能开通、长时间严重不可用，或产品与描述存在重大差异且无法在合理时间内解决，我们会审核退款申请。根据具体情况，我们可能恢复权益、纠正账单、提供服务补偿，或给予全额或部分退款。本条不限制法律强制规定的救济。</p></section>
  <section><h2>5. 取消订阅</h2><p>你可以随时通过 Waffo 订单邮件中的 Buyer Portal 取消自动续订。Waffo 要求至少在续订日期前 48 小时取消。取消通常在当前已付费周期结束时生效，在此之前你仍可使用 Premium。卸载扩展、停止使用或删除 Verbia 账号不会自动取消 Waffo 订阅。</p></section>
  <section><h2>6. 如何申请退款</h2><ol><li>打开 Waffo 订单邮件，通过其中的 Buyer Portal 提交退款申请；也可以发送邮件至 <a href="mailto:henri@henriz.dev">henri@henriz.dev</a>。</li><li>提供 Verbia 账号邮箱、Waffo 订单号或付款编号、购买日期、原因和申请金额。请勿发送银行卡信息。</li><li>为了核验账号、用量或技术问题，我们可能要求少量补充信息。</li></ol><p>提交申请不代表退款一定获批。获批退款会退回原付款方式，到账时间由银行和付款网络决定。Waffo 表示，批准后处理可能需要最多 14 个工作日。除非法律另有要求，我们不补偿银行手续费、货币兑换费或其他第三方费用。</p></section>
  <section><h2>7. 退款后的权益</h2><p>全额退款会终止相应的 Premium 权益；部分退款可能缩短或调整使用期限。如果付款被撤销、拒付或认定为未经授权，相关权益可能在调查期间暂停。发起拒付前，请先联系我们或 Waffo，以便我们有机会解决问题。</p></section>
  <section><h2>8. 消费者权利</h2><p>本政策不排除适用于你的法律中不可放弃的冷静期权利、数字服务缺陷救济或其他消费者权利。如果强制性法律提供更有利的权利，以该法律为准。</p></section>
</LegalPage>; }
