import { mount } from 'svelte'
import '../app.css'
import App from './eval.svelte'

const app = mount(App, {
  target: document.body,
})

export default app