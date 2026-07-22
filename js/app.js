const {
  getUsers,
  saveUsers,
  getProducts,
  saveProducts,
  getSession,
  setSession,
  clearSession
} = window.AppStorage;

let authMode='login';
    function showApp(username){authScreen.classList.add('hidden');appRoot.classList.remove('hidden');profileName.textContent=username;profileLetter.textContent=username.charAt(0).toLocaleUpperCase('tr')}
  function showAuth(){appRoot.classList.add('hidden');authScreen.classList.remove('hidden');authForm.reset();authError.style.display='none'}
  const activeUser=getSession();if(activeUser)showApp(activeUser);
  authSwitch.onclick=()=>{authMode=authMode==='login'?'register':'login';const reg=authMode==='register';authTitle.textContent=reg?'Yeni hesap oluştur':'Tekrar hoş geldin';authDesc.textContent=reg?'Bilgilerini girerek sisteme katıl.':'Devam etmek için hesabına giriş yap.';emailField.classList.toggle('hidden',!reg);authEmail.required=reg;authPassword.autocomplete=reg?'new-password':'current-password';authSubmit.textContent=reg?'Kayıt ol':'Giriş yap';switchText.textContent=reg?'Zaten hesabın var mı?':'Hesabın yok mu?';authSwitch.textContent=reg?'Giriş yap':'Kayıt ol';authError.style.display='none'};
  authForm.onsubmit=e=>{e.preventDefault();const username=authUsername.value.trim(),password=authPassword.value,email=authEmail.value.trim();let list=getUsers();if(authMode==='register'){if(list.some(u=>u.username.toLocaleLowerCase('tr')===username.toLocaleLowerCase('tr'))){authError.textContent='Bu kullanıcı adı zaten kullanılıyor.';authError.style.display='block';return}list.push({username,password,email});saveUsers(list);setSession(username);showApp(username)}else{const found=list.find(u=>u.username===username&&u.password===password);if(!found){authError.textContent='Kullanıcı adı veya parola yanlış.';authError.style.display='block';return}setSession(username);showApp(username)}};
  logout.onclick=()=>{clearSession();showAuth()};
  const starter=[{id:1,name:'Laptop Lenovo',category:'Bilgisayar',price:25000,stock:10},{id:2,name:'Gaming Laptop',category:'Bilgisayar',price:44999,stock:3},{id:3,name:'Akıllı Telefon',category:'Telefon',price:18999,stock:7},{id:4,name:'Kablosuz Mouse',category:'Aksesuar',price:850,stock:4},{id:5,name:'Mekanik Klavye',category:'Aksesuar',price:1750,stock:12}];
  let products=getProducts(starter);
  const titles={dashboard:['Dashboard','E-ticaret sisteminin genel durumu'],products:['Ürünler','Ürün kataloğunu ve stokları yönet'],categories:['Kategoriler','Ürün gruplarını görüntüle'],orders:['Siparişler','Müşteri siparişlerini takip et'],stock:['Stok Hareketleri','Tüm stok değişikliklerini incele'],logs:['Sistem Logları','Kullanıcı işlemlerini denetle']};
  const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n);
  function render(q=''){const filtered=products.filter(p=>p.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));productRows.innerHTML=filtered.map(p=>`<tr><td>#${p.id}</td><td><b>${p.name}</b></td><td>${p.category}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><span class="pill ${p.stock<5?'low':''}">${p.stock<5?'Stok az':'Aktif'}</span></td><td><button class="link" onclick="removeProduct(${p.id})">Sil</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Ürün bulunamadı.</td></tr>';productCount.textContent=products.length;stockCount.textContent=products.reduce((a,p)=>a+p.stock,0);lowStock.innerHTML=[...products].sort((a,b)=>a.stock-b.stock).slice(0,4).map(p=>`<div class="stock-row"><span>${p.name}<small> · ${p.stock} adet</small></span><b>${p.stock}</b><div class="progress"><i style="width:${Math.min(100,p.stock*8)}%"></i></div></div>`).join('')}
  function removeProduct(id){if(confirm('Bu ürün silinsin mi?')){products=products.filter(p=>p.id!==id);save()}}function save(){saveProducts(products);render(productSearch.value)}
  nav.addEventListener('click',e=>{const b=e.target.closest('button[data-page]');if(!b)return;document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(b.dataset.page).classList.add('active');title.textContent=titles[b.dataset.page][0];subtitle.textContent=titles[b.dataset.page][1];side.classList.remove('open')});
  const openModal=()=>productDialog.showModal();addProduct.onclick=openModal;addProductTop.onclick=openModal;cancel.onclick=()=>productDialog.close();menuBtn.onclick=()=>side.classList.toggle('open');productSearch.oninput=e=>render(e.target.value);
  productForm.onsubmit=e=>{e.preventDefault();products.push({id:Math.max(0,...products.map(p=>p.id))+1,name:pName.value,category:pCategory.value,price:+pPrice.value,stock:+pStock.value});save();productForm.reset();productDialog.close()};render();
