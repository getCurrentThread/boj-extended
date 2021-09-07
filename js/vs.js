function extendVs() {
  Utils.loadCSS('css/user.css');

  const { pathname } = window.location;
  const urlPrefix = '/vs/';
  const users = pathname.substr(urlPrefix.length).split('/') || [];
  if (users.length !== 2) {
    alert('비교 대상은 2명만 가능합니다.');
    window.history.back();
    return;
  }

  // main
  Config.getProblems((problems) => {
    // recreate page
    const container = document.getElementsByClassName('container content')[0];
    container.innerHTML = '';

    // add vs form
    const vsform = createVsForm(users[0], users[1]); // eslint-disable-line no-undef
    vsform.style.marginBottom = '20px';
    container.appendChild(vsform);

    const tagByPid = {};

    fetchProblems(users[0], async (p1) => {
      let solved1 = [];
      let tried1 = [];
      let unsolved1 = [];
      await p1.forEach((p) => {
        if (p.title.startsWith('맞은')) solved1 = p.tags;
        else {
          if (p.title.startsWith('맞았')) tried1 = p.tags;
          unsolved1 = p.tags;
        }
      });
      fetchProblems(users[1], async (p2) => {
        let solved2 = [];
        let tried2 = [];
        let unsolved2 = [];
        await p2.forEach((p) => {
          if (p.title.startsWith('맞은')) solved2 = p.tags;
          else {
            if (p.title.startsWith('맞았')) tried2 = p.tags;
            unsolved2 = p.tags;
          }
        });

        const solvedBoth = solved1
          .filter((p) => solved2.includes(p))
          .map(createProblemTag);
        const solved1Only = solved1
          .filter((p) => !solved2.includes(p))
          .map(createProblemTag);
        const solved2Only = solved2
          .filter((p) => !solved1.includes(p))
          .map(createProblemTag);
        const tried1Only = tried1
          .filter((p) => !solved2.includes(p))
          .map(createProblemTag);
        const tried2Only = tried2
          .filter((p) => !solved1.includes(p))
          .map(createProblemTag);
        const solvedNobody = unsolved1
          .filter((p) => unsolved2.includes(p))
          .map(createProblemTag);

        const userHref1 = Utils.createElement('a', {
          href: '/user/' + users[0],
        });
        userHref1.innerText = users[0];
        const userHref2 = Utils.createElement('a', {
          href: '/user/' + users[1],
        });
        userHref2.innerText = users[1];
        const userTag1 = userHref1.outerHTML;
        const userTag2 = userHref2.outerHTML;

        // create panels
        const panels = [
          createPanel(
            userTag1 + '와 ' + userTag2 + ' 모두 푼 문제',
            solvedBoth
          ),
          createPanel(userTag1 + '만 푼 문제', solved1Only),
          createPanel(userTag2 + '만 푼 문제', solved2Only),
          createPanel(
            userTag1 + '만 맞았지만 만점을 받지 못한 문제',
            tried1Only
          ),
          createPanel(
            userTag2 + '만 맞았지만 만점을 받지 못한 문제',
            tried2Only
          ),
          createPanel('둘 다 시도했지만 맞지 못한 문제', solvedNobody),
        ];

        for (const panel of panels) {
          container.appendChild(panel);
        }

        // create checkboxes
        const checkboxes = document.createElement('div');
        const checkbox1 = document.createElement('input');
        checkbox1.setAttribute('type', 'checkbox');
        checkbox1.setAttribute('id', 'show-pid');
        checkbox1.addEventListener('change', (evt) => {
          Config.save('show-pid', evt.target.checked);
          display(panels, 'show-id', evt.target.checked);
        });
        const checkbox2 = document.createElement('input');
        checkbox2.setAttribute('type', 'checkbox');
        checkbox1.setAttribute('id', 'show-pname');
        checkbox2.addEventListener('change', (evt) => {
          Config.save('show-pname', evt.target.checked);
          display(panels, 'show-name', evt.target.checked);
        });

        const label1 = document.createElement('label');
        label1.setAttribute('for', 'show-pid');
        label1.innerText = '문제 번호';
        const label2 = document.createElement('label');
        label2.setAttribute('for', 'show-pname');
        label2.innerText = '문제 제목';

        checkboxes.setAttribute('class', 'problem-toggles');
        checkboxes.appendChild(checkbox1);
        checkboxes.appendChild(label1);
        checkboxes.appendChild(checkbox2);
        checkboxes.appendChild(label2);

        // add checkboxes whether problem's id or name
        container.insertBefore(checkboxes, vsform);

        // sync with configs
        Config.load('show-pid', (checked) => {
          checked = checked === null || checked === undefined ? true : checked;
          checkbox1.checked = checked;
          display(panels, 'show-id', checked);
        });
        Config.load('show-pname', (checked) => {
          checkbox2.checked = checked;
          display(panels, 'show-name', checked);
        });
      });
    });

    function createProblemTag(pid) {
      const e = tagByPid[pid];
      const a = e.cloneNode();
      const pname = problems[pid] || '*New Problem';
      a.style.display = 'inline';
      a.style.marginRight = '3px';
      a.style.wordBreak = 'break-all';
      a.innerHTML =
        '<span class="pid">' +
        pid +
        '</span> <span class="pname">' +
        pname +
        '</span>';
      return a;
    }

    // title: string, body: Node
    function createPanel(title, tags) {
      const panel = Utils.createElement('div', {
        class: 'panel panel-default',
      });
      const phead = Utils.createElement('div', { class: 'panel-heading' });
      const pbody = Utils.createElement('div', { class: 'panel-body' });
      phead.innerHTML = '<h3 class="panel-title">' + title + '</h3>';
      tags.forEach((t) => pbody.appendChild(t));
      panel.appendChild(phead);
      panel.appendChild(pbody);
      return panel;
    }

    function fetchProblems(username, response) {
      Utils.requestAjax(
        'https://www.acmicpc.net/user/' + username,
        (html, error) => {
          if (error) {
            console.log(error);
            alert('존재하지 않거나 잘못된 아이디입니다.');
            window.history.back();
            return;
          }
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const panels = doc.querySelectorAll('.panel');
          const problems = [];
          for (let i = 0; i < panels.length; ++i) {
            const tags = [];
            const title = panels[i].querySelector('.panel-title').innerText;
            panels[i].querySelectorAll('a[href^="/problem/"]').forEach((a) => {
              const pid = parseInt(a.href.substr(a.href.lastIndexOf('/') + 1));
              tags.push(pid);
              tagByPid[pid] = a;
            });
            problems.push({
              title: title,
              tags: tags,
            });
          }
          response(problems);
        }
      );
    }
  });

  function display(containers, key, visible) {
    containers.forEach((panel) => {
      if (visible) {
        panel.setAttribute(key, true);
      } else {
        panel.removeAttribute(key);
      }
    });
  }
}
